"""Shared helpers for the product-page scripts (stdlib only).

Used by build-products.py, process-images.py and import-catalogue.py.
"""
import json
import re
import unicodedata
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECORDS_DIR = ROOT / 'data/products'
SCHEMA_PATH = ROOT / 'data/schema/product.schema.json'
PRIVATE_DIR = ROOT / 'data/private'   # gitignored — never deployed
PRIVATE_SCHEMA_PATH = ROOT / 'data/schema/product-private.schema.json'
PRIVATE_PRICING_KEYS = ('min_qty', 'increment', 'source', 'review_date')
IMAGES_DIR = ROOT / 'assets/images/products'
IMAGE_SOURCE = Path.home() / 'Downloads/Product Images'
SITE = 'https://acsupplyco.co.uk'

# Existing site sections a product can belong to, with the breadcrumb label.
CATEGORIES = {
    'coffee-cups': 'Coffee cups',
    'takeaway-packaging': 'Takeaway packaging',
    'paper-bags': 'Paper bags',
    'bakery-packaging': 'Bakery packaging',
    'custom-pizza-boxes': 'Custom pizza boxes',
    'catering-supplies': 'Catering supplies',
}


class BuildError(Exception):
    """A record, image or rendered page failed validation."""


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as err:
        raise BuildError(f'{path.relative_to(ROOT)}: invalid JSON — {err}')


def load_records(merge_private=True):
    """Return [(path, record)] for every catalogue record, sorted by filename.

    data/products/<slug>.json is publicly served, so everything commercially
    sensitive lives in the gitignored data/private/<slug>.json. Here the two are
    merged in memory: record['internal'], plus min_qty / increment / source /
    review_date on each pricing entry. On a checkout without the private files
    the records load without those fields.
    """
    records = []
    for path in sorted(RECORDS_DIR.glob('*.json')):
        record = read_json(path)
        private_path = PRIVATE_DIR / path.name
        if merge_private and private_path.exists():
            private = read_json(private_path)
            record['internal'] = private.get('internal', {})
            for entry in record.get('pricing', []):
                entry.update(private.get('pricing', {}).get(entry.get('ref'), {}))
        records.append((path, record))
    return records


def save_record(path, record):
    """Write a merged record back as its public file + private companion, never mixing the two."""
    public = json.loads(json.dumps(record))
    private = {'internal': public.pop('internal', {}), 'pricing': {}}
    for entry in public['pricing']:
        private['pricing'][entry['ref']] = {k: entry.pop(k) for k in PRIVATE_PRICING_KEYS if k in entry}
    path.write_text(json.dumps(public, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    PRIVATE_DIR.mkdir(exist_ok=True)
    (PRIVATE_DIR / path.name).write_text(json.dumps(private, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def source_path(file):
    """Where an images[].file lives: the Downloads library, or a master kept in this repo ("repo:output/…")."""
    return ROOT / file.removeprefix('repo:') if file.startswith('repo:') else IMAGE_SOURCE / file


def web_name(source_file):
    """Web-safe output stem for a source image path: lowercase, hyphens, no spaces."""
    stem = Path(source_file).stem
    stem = unicodedata.normalize('NFKD', stem).encode('ascii', 'ignore').decode()
    stem = re.sub(r'[^a-z0-9]+', '-', stem.lower().replace('__', '-')).strip('-')
    return stem


# ---------- money: Decimal in Python, mirrored by BigInt maths in product-page.js ----------

def unit_price(tier_unit, multipliers):
    """tier × Π(multipliers), rounded half-up to 3 dp. None stays None (POA)."""
    if tier_unit is None:
        return None
    value = Decimal(tier_unit)
    for mult in multipliers:
        value *= Decimal(mult)
    return value.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)


def subtotal(qty, unit):
    return (Decimal(qty) * unit).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def gbp(value, places):
    return f'£{value:,.{places}f}'


# ---------- minimal JSON Schema (draft 2020-12 subset) validator ----------
# Supports only the keywords product.schema.json uses, and raises on any other
# keyword so the schema can never silently outgrow the validator.

_ANNOTATIONS = {'$schema', '$id', '$defs', 'title', 'description', 'default', 'examples', '$comment'}
_TYPES = {
    'object': dict, 'array': list, 'string': str, 'boolean': bool, 'null': type(None),
}


def _is_type(value, name):
    if name == 'integer':
        return isinstance(value, int) and not isinstance(value, bool)
    if name == 'number':
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(value, _TYPES[name])


def validate_schema(value, schema, root=None, path='$'):
    """Return a list of 'path: problem' strings (empty when valid)."""
    root = root or schema
    errors = []
    if '$ref' in schema:
        target = root
        for part in schema['$ref'].removeprefix('#/').split('/'):
            target = target[part]
        return validate_schema(value, target, root, path)
    for keyword in schema:
        if keyword not in _ANNOTATIONS and keyword not in _KEYWORDS:
            raise BuildError(f'schema keyword "{keyword}" is not supported by productlib.validate_schema')
    if 'type' in schema:
        names = schema['type'] if isinstance(schema['type'], list) else [schema['type']]
        if not any(_is_type(value, n) for n in names):
            return [f'{path}: expected {" or ".join(names)}, got {type(value).__name__}']
    if 'const' in schema and value != schema['const']:
        errors.append(f'{path}: must equal {schema["const"]!r}')
    if 'enum' in schema and value not in schema['enum']:
        errors.append(f'{path}: {value!r} is not one of {schema["enum"]}')
    if isinstance(value, str):
        if 'pattern' in schema and not re.search(schema['pattern'], value):
            errors.append(f'{path}: {value!r} does not match {schema["pattern"]}')
        if len(value) < schema.get('minLength', 0):
            errors.append(f'{path}: shorter than {schema["minLength"]} characters')
    if _is_type(value, 'number') and 'minimum' in schema and value < schema['minimum']:
        errors.append(f'{path}: {value} is below minimum {schema["minimum"]}')
    if isinstance(value, list):
        if len(value) < schema.get('minItems', 0):
            errors.append(f'{path}: needs at least {schema["minItems"]} item(s)')
        if 'items' in schema:
            for i, item in enumerate(value):
                errors += validate_schema(item, schema['items'], root, f'{path}[{i}]')
    if isinstance(value, dict):
        for key in schema.get('required', []):
            if key not in value:
                errors.append(f'{path}: missing required field "{key}"')
        props = schema.get('properties', {})
        extra = schema.get('additionalProperties', True)
        for key, item in value.items():
            if key in props:
                errors += validate_schema(item, props[key], root, f'{path}.{key}')
            elif extra is False:
                errors.append(f'{path}: unexpected field "{key}"')
            elif isinstance(extra, dict):
                errors += validate_schema(item, extra, root, f'{path}.{key}')
    return errors


_KEYWORDS = {'$ref', 'type', 'const', 'enum', 'pattern', 'minLength', 'minimum', 'minItems',
             'items', 'required', 'properties', 'additionalProperties'}
