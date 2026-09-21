#!/usr/bin/env python3
"""Pull confirmed prices and option multipliers from the master catalogue into data/products/*.json.

    python3 scripts/import-catalogue.py                 # print the diff, write nothing
    python3 scripts/import-catalogue.py --apply         # write the changes, then rebuild with build-products.py
    python3 scripts/import-catalogue.py --json [--apply]  # read catalogue-v6.json instead (no openpyxl needed)
    python3 scripts/import-catalogue.py path/to/other.xlsx

The JSON records stay the single editable store: this only updates
pricing[].tiers and options[].values[].mult, matched through the internal.catalogue
map in data/private/<slug>.json (pricing_ref → Price List item, option value → Options row).
Floor prices and notes are read past and never copied. A multiplier whose
evidence says ESTIMATE is never imported — those options stay quote-only.
"""
import json
import sys
from datetime import date
from decimal import Decimal

from productlib import IMAGE_SOURCE, BuildError, load_records, save_record

DATA_DIR = IMAGE_SOURCE / '_data'
TIER_PAIRS = 6


def decimal_text(value, places):
    """Spreadsheet number → decimal string with at least `places` dp, never float noise."""
    number = Decimal(str(value)).normalize()
    digits = max(places, -number.as_tuple().exponent)
    return f'{number:.{digits}f}'


def read_json(path):
    raw = json.loads(path.read_text(encoding='utf-8'))
    items = {i['name']: [(q, u) for q, u in i['tiers']] for i in raw['items']}
    options = {(o['group'], o['type'], o['value']): (o['mult'], o.get('note') or '') for o in raw['options']}
    return items, options


def read_xlsx(path):
    try:
        import openpyxl
    except ImportError:
        raise BuildError('reading the .xlsx needs openpyxl (pip install openpyxl) — or pass --json to read catalogue-v6.json')
    book = openpyxl.load_workbook(path, data_only=True, read_only=True)
    rows = book['Price List'].iter_rows(values_only=True)
    header = [str(c or '').strip() for c in next(rows)]
    wanted = ['Item'] + [f'Tier {n} {kind}' for n in range(1, TIER_PAIRS + 1) for kind in ('Qty', '£')]
    missing = [name for name in wanted if name not in header]
    if missing:
        raise BuildError(f'Price List tab is missing column(s): {missing}')
    col = {name: header.index(name) for name in wanted}
    items = {}
    for row in rows:
        if not row[col['Item']]:
            continue
        tiers = [(row[col[f'Tier {n} Qty']], row[col[f'Tier {n} £']]) for n in range(1, TIER_PAIRS + 1)]
        items[str(row[col['Item']]).strip()] = [(int(q), u) for q, u in tiers if q is not None]
    rows = book['Options'].iter_rows(values_only=True)
    header = [str(c or '').strip() for c in next(rows)]
    g, t, v, m, note = (header.index(h) for h in ('Option Group', 'Option Type', 'Option Value', '× Multiplier', 'Source / evidence'))
    options = {(r[g], r[t], str(r[v]).strip()): (r[m], r[note] or '') for r in rows if r[g]}
    return items, options


def plan(record, items, options):
    """Return (changes, problems); changes are (description, apply-function) pairs."""
    changes, problems = [], []
    mapping = record.get('internal', {}).get('catalogue')
    if not mapping:
        return changes, [f'{record["slug"]}: no internal.catalogue map in data/private/{record["slug"]}.json — cannot import']
    for entry in record['pricing']:
        if entry['ref'] not in mapping['items']:
            continue  # priced from a supplier cost sheet, not the catalogue (see the private file's notes)
        name = mapping['items'][entry['ref']]
        if name not in items:
            problems.append(f'{record["slug"]}: pricing "{entry["ref"]}" → catalogue item {name!r} not found')
            continue
        new = [{'qty': q, 'unit': None if u is None else decimal_text(u, 3)} for q, u in items[name]]
        if new != entry['tiers']:
            old = {t['qty']: t['unit'] for t in entry['tiers']}
            for tier in new:
                if old.get(tier['qty'], 'absent') != tier['unit']:
                    changes.append((f'{entry["ref"]} @ {tier["qty"]:,}: {old.get(tier["qty"], "—")} → {tier["unit"] or "POA"}', None))
            for qty in old.keys() - {t['qty'] for t in new}:
                changes.append((f'{entry["ref"]} @ {qty:,}: tier removed', None))

            def apply(entry=entry, new=new):
                entry['tiers'], entry['review_date'] = new, date.today().isoformat()
            changes.append((None, apply))
    for option in record['options']:
        spec = mapping['options'].get(option['key'])
        if not spec:
            continue
        for value in option['values']:
            key = (mapping['group'], spec['type'], spec['values'].get(value['value']))
            if key not in options:
                problems.append(f'{record["slug"]}: option {option["key"]}={value["value"]} → catalogue row {key} not found')
                continue
            mult, evidence = options[key]
            if 'ESTIMATE' in evidence.upper():
                if value.get('mult'):
                    problems.append(f'{record["slug"]}: {option["key"]}={value["value"]} carries a multiplier but the catalogue marks it an ESTIMATE')
                continue
            new = None if Decimal(str(mult)) == 1 else decimal_text(mult, 1)
            if new != value.get('mult'):
                def apply(value=value, new=new):
                    value.pop('mult', None) if new is None else value.__setitem__('mult', new)
                changes.append((f'{option["key"]}={value["value"]}: ×{value.get("mult", "1")} → ×{new or "1"}', apply))
    return changes, problems


def main(argv):
    apply = '--apply' in argv
    paths = [a for a in argv if not a.startswith('--')]
    if '--json' in argv:
        items, options = read_json(DATA_DIR / 'catalogue-v6.json')
    else:
        items, options = read_xlsx(paths[0] if paths else DATA_DIR / 'AC_Supply_Catalogue_v6.xlsx')
    total, all_problems = 0, []
    for path, record in load_records():
        changes, problems = plan(record, items, options)
        all_problems += problems
        lines = [text for text, _ in changes if text]
        print(f'{path.name}: {len(lines)} change(s)')
        for line in lines:
            print(f'  {line}')
        total += len(lines)
        if apply and lines:
            for _, fn in changes:
                if fn:
                    fn()
            record['internal']['review_date'] = date.today().isoformat()
            save_record(path, record)
            print(f'  written → {path.name} (+ private companion)')
    if all_problems:
        raise BuildError('\n'.join(all_problems))
    if total and not apply:
        print('\nNothing written. Re-run with --apply to update the records, then run build-products.py.')


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except BuildError as err:
        sys.exit(f'IMPORT FAILED\n{err}')
