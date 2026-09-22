#!/usr/bin/env python3
"""Browser checks for the generated product pages (local only — not part of the deploy).

    python3 scripts/build-products.py && python3 scripts/test-product-pages.py [slug ...]

Needs the Python Playwright package with Chromium installed. Serves the repo on
a free local port itself. States the real catalogue doesn't contain (a missing
combination, a POA tier) are produced by rewriting the page's embedded
#product-data JSON in flight, so no fixture records are ever written to disk.
"""
import functools
import http.server
import json
import re
import sys
import threading
from decimal import Decimal

from playwright.sync_api import sync_playwright

from productlib import ROOT, gbp, load_records, subtotal, unit_price, web_name

failures = []


def check(name, ok, detail=''):
    print(f'  {"PASS" if ok else "FAIL"}  {name}' + (f' — {detail}' if detail and not ok else ''))
    if not ok:
        failures.append(name)


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def open_page(browser, base, url_path, mutate=None, width=1280):
    """New page with tracking blocked, console captured, and optionally mutated product data."""
    page = browser.new_page(viewport={'width': width, 'height': 900})
    page.problems = []
    page.on('pageerror', lambda e: page.problems.append(f'pageerror: {e}'))
    page.on('console', lambda m: page.problems.append(f'console {m.type}: {m.text}') if m.type == 'error' else None)
    page.route('**/*googletagmanager*', lambda route: route.abort())
    if mutate:
        def rewrite(route):
            body = route.fetch().text()
            match = re.search(r'(<script id="product-data" type="application/json">)(.*?)(</script>)', body, re.S)
            data = json.loads(match.group(2))
            mutate(data)
            route.fulfill(body=body[:match.start(2)] + json.dumps(data).replace('<', '\\u003c') + body[match.end(2):],
                          content_type='text/html; charset=utf-8')
        page.route(re.compile(r'/[a-z-]+/[a-z-]+/(\?.*)?$'), rewrite)
    page.add_init_script("try { localStorage.setItem('ac_consent', 'denied'); } catch (e) {}")
    page.goto(base + url_path, wait_until='load')
    page.wait_for_selector('#tiers > *')
    return page


def pressed(page, option, value):
    return page.get_attribute(f'[data-option="{option}"][data-value="{value}"]', 'aria-pressed') == 'true'


def choose(page, option, value):
    page.click(f'[data-option="{option}"][data-value="{value}"]')


def go_to(page, target):
    """Reach a selection one click at a time, taking whichever needed button is currently enabled —
    some routes pass through combinations that don't exist, and those buttons are disabled."""
    for _ in range(len(target) + 1):
        pending = [(k, v) for k, v in target.items() if not pressed(page, k, v)]
        if not pending:
            return
        key, value = next(((k, v) for k, v in pending if page.is_enabled(f'[data-option="{k}"][data-value="{v}"]')), pending[0])
        choose(page, key, value)


def selection(page, record):
    return {o['key']: next(v['value'] for v in o['values'] if pressed(page, o['key'], v['value'])) for o in record['options']}


def test_record(browser, base, record):
    slug = record['slug']
    url = f'/preview/{slug}/' if record['status'] == 'preview' else f'/{record["category"]}/{slug}/'
    options = record['options']
    first = options[0]
    print(f'\n{slug}')
    page = open_page(browser, base, url)

    # -- content is in the HTML before JavaScript runs
    static = browser.new_context(java_script_enabled=False).new_page()
    static.goto(base + url)
    html_text = static.inner_text('body')
    check('static HTML carries title, option labels, tier prices and specs',
          record['title'] in html_text and all(v['label'] in html_text for o in options for v in o['values'])
          and '£' in static.inner_text('#tiers') and record['specs'][0]['value'] in html_text)
    static.context.close()

    # -- size switch changes hero
    before = page.get_attribute('#hero-image', 'src')
    other = next((v['value'] for v in first['values'] if not v.get('default')), None)
    if other is None:
        check('single-value first option: hero renders', page.evaluate("document.getElementById('hero-image').naturalWidth > 0"))
    else:
        choose(page, first['key'], other)
    manifest = json.loads((ROOT / 'assets/images/products' / slug / 'manifest.json').read_text())
    has_own_shot = any(i['match'].get(first['key']) == other and web_name(i['file']) in manifest for i in record['images'])
    if other is None:
        pass
    elif has_own_shot:
        check('switching the first option changes the hero image', page.get_attribute('#hero-image', 'src') != before)
    else:
        check('no shot for that option yet: hero falls back to a family image instead of going blank',
              page.get_attribute('#hero-image', 'src') and page.evaluate("document.getElementById('hero-image').naturalWidth > 0"))
    check('hero image actually loads', page.evaluate("() => { const i = document.getElementById('hero-image'); return i.complete && i.naturalWidth > 0; }")
          or page.wait_for_function("document.getElementById('hero-image').naturalWidth > 0", timeout=5000) is not None)

    # -- every priced variant: each tier card updates unit / subtotal / total exactly
    mismatches, cards = [], 0
    for variant in [v for v in record['variants'] if v['available'] and v.get('pricing_ref')]:
        go_to(page, variant['selection'])
        entry = next(p for p in record['pricing'] if p['ref'] == variant['pricing_ref'])
        mults = [] if entry.get('apply_multipliers') is False else [v['mult'] for o in options for v in o['values'] if v['value'] == variant['selection'][o['key']] and v.get('mult')]
        shown = [int(b.get_attribute('data-quantity')) for b in page.locator('#tiers .tier').all()]
        if shown != [t['qty'] for t in entry['tiers']]:
            mismatches.append(f'{variant["sku"]}: tiers {shown}')
        for tier in entry['tiers']:
            page.click(f'[data-quantity="{tier["qty"]}"]')
            unit = unit_price(tier['unit'], mults)
            want_unit, want_total = gbp(unit, 3), gbp(subtotal(tier['qty'], unit) + sum(Decimal(c['amount']) for c in record['charges']), 2)
            rows, total = page.inner_text('#order-rows'), page.inner_text('#total')
            card = page.inner_text(f'[data-quantity="{tier["qty"]}"]')
            cards += 1
            if want_unit not in rows or gbp(subtotal(tier['qty'], unit), 2) not in rows or total != want_total or want_unit not in card:
                mismatches.append(f'{variant["sku"]} @{tier["qty"]}: want {want_unit}/{want_total}, got {rows!r}/{total}')
    check(f'unit, subtotal and total correct on all {cards} tier cards (Python Decimal vs browser)', not mismatches, '; '.join(mismatches[:3]))

    # -- quote-only state
    quote_only = next((v for v in record['variants'] if not v['available']), None)
    if quote_only:
        go_to(page, quote_only['selection'])
        check('quote-only variant: no tier cards, "Price on request", never £0',
              page.locator('#tiers .tier').count() == 0 and page.inner_text('#total') == 'Price on request'
              and '£0' not in page.inner_text('.configurator .order') and not page.is_hidden('#selection-note'))
        check('quote-only variant keeps every selection', selection(page, record) == quote_only['selection'])
        page.click('.cta[data-quote]')
        check('quote-only enquiry carries SKU and "To be quoted"',
              page.input_value('[name=variant_sku]') == quote_only['sku'] and page.input_value('[name=unit_estimate]') == 'To be quoted')
        page.click('#close-quote')
    check('no console errors (main flow)', not page.problems, '; '.join(page.problems[:3]))
    page.close()

    # -- invalid combination: drop one variant from the embedded data (needs two options with alternatives)
    multi = [o for o in options if len(o['values']) > 1]
    if len(multi) < 2 or other is None:
        print('  skip  invalid-combination checks (page has fewer than two multi-value options)')
    else:
        invalid_combination_checks(browser, base, url, record, options, first, other, multi[1] if multi[0] is first else multi[0])

    keyboard_and_enquiry_checks(browser, base, url, record, options, first, other)


def invalid_combination_checks(browser, base, url, record, options, first, other, second):
    gone = {o['key']: next(v['value'] for v in o['values'] if v.get('default')) for o in options}
    gone[first['key']], gone[second['key']] = other, next(v['value'] for v in second['values'] if not v.get('default'))

    def drop(data):
        data['variants'] = [v for v in data['variants'] if v['selection'] != gone]
    page = open_page(browser, base, url, mutate=drop)
    choose(page, second['key'], gone[second['key']])
    kept = selection(page, record)
    button = page.locator(f'[data-option="{first["key"]}"][data-value="{other}"]')
    check('invalid combination: the value is disabled', button.is_disabled())
    button.click(force=True)
    check('invalid combination: clicking it changes nothing', selection(page, record) == kept)
    page.close()
    query = '&'.join(f'{k}={v}' for k, v in gone.items())
    page = open_page(browser, base, f'{url}?{query}', mutate=drop)
    check('arriving on an invalid combination: one-line message, selections kept, no price',
          'isn’t available' in page.inner_text('#selection-note') and selection(page, record) == gone
          and page.inner_text('#total') == 'Price on request')
    page.close()


def keyboard_and_enquiry_checks(browser, base, url, record, options, first, other):
    # -- POA tier
    def poa(data):
        for tiers in data['pricing'].values():
            tiers[-1][1] = None
    page = open_page(browser, base, url, mutate=poa)
    last = page.locator('#tiers .tier').last
    last.click()
    check('POA tier: card says POA, total "Price on request", never £0',
          'POA' in page.locator('#tiers .tier').last.inner_text() and page.inner_text('#total') == 'Price on request'
          and '£0.00' not in page.inner_text('.configurator'))
    page.close()

    # -- keyboard operation
    page = open_page(browser, base, url)
    if other is not None:
        page.focus(f'[data-option="{first["key"]}"][data-value="{other}"]')
        page.keyboard.press('Enter')
        check('keyboard: Enter selects an option button', pressed(page, first['key'], other))
        if page.locator('#tiers .tier').count() < 2:  # that value is quote-only: go back to the priced default
            page.close()
            page = open_page(browser, base, url)
    page.locator('#tiers .tier').nth(1).focus()
    page.keyboard.press('Space')
    second_tier = page.locator('#tiers .tier').nth(1)
    check('keyboard: Space selects a tier card and focus stays on it',
          second_tier.get_attribute('aria-pressed') == 'true'
          and page.evaluate("document.activeElement.dataset.quantity") == second_tier.get_attribute('data-quantity'))
    page.keyboard.press('Tab')
    check('keyboard: Tab order continues through the tier cards', page.evaluate("document.activeElement.classList.contains('tier') || document.activeElement.id === 'custom-quantity'"))

    # -- enquiry payload (Web3Forms intercepted — nothing is really sent)
    sent = {}

    def capture(route):
        sent.update(json.loads(route.request.post_data))
        route.fulfill(status=200, content_type='application/json', body='{"success": true}')
    page.route('https://api.web3forms.com/submit', capture)
    current = selection(page, record)
    variant = next(v for v in record['variants'] if v['selection'] == current)
    qty = int(second_tier.get_attribute('data-quantity'))
    page.click('.cta[data-quote]')
    page.fill('[name=name]', 'Test Buyer')
    page.fill('[name=email]', 'Buyer@Example.com')
    page.fill('[name=phone]', '+44 7000 000000')
    page.click('#quote-submit')
    page.wait_for_url('**/thank-you/', timeout=5000)
    entry = next(p for p in record['pricing'] if p['ref'] == variant['pricing_ref'])
    mults = [] if entry.get('apply_multipliers') is False else [v['mult'] for o in options for v in o['values'] if v['value'] == current[o['key']] and v.get('mult')]
    unit = unit_price(next(t['unit'] for t in entry['tiers'] if t['qty'] == qty), mults)
    labels = [next(v['label'] for v in o['values'] if v['value'] == current[o['key']]) for o in options]
    check('enquiry payload: product_id, variant_sku, options, qty, estimates, indicative note',
          sent.get('product_id') == record['id'] and sent.get('variant_sku') == variant['sku']
          and all(label in sent.get('selected_options', '') for label in labels)
          and sent.get('qty') == f'{qty:,}' and gbp(unit, 3) in sent.get('unit_estimate', '')
          and sent.get('subtotal_estimate') == gbp(subtotal(qty, unit), 2) and 'indicative' in sent.get('price_note', '')
          and sent.get('access_key') == '2ef0136f-1971-4072-8c61-e9450526b3ad', json.dumps(sent)[:300])
    check('no console errors (keyboard + enquiry flow)', not page.problems, '; '.join(page.problems[:3]))
    page.close()

    # -- custom quantity + mobile
    page = open_page(browser, base, url, width=390)
    page.click('#custom-quantity')
    check('custom quantity: quantity field is free and estimates are "To be quoted"',
          page.input_value('#quote-qty') == '' and page.is_editable('#quote-qty') and page.input_value('[name=subtotal_estimate]') == 'To be quoted')
    page.click('#close-quote')
    check('390px: no horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    page.close()


def main():
    only = set(sys.argv[1:])  # optional slugs: test-product-pages.py cold-cups pizza-boxes
    records = [r for _, r in load_records() if r['status'] != 'draft' and (not only or r['slug'] in only)]
    server = serve()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for record in records:
            test_record(browser, base, record)
        browser.close()
    server.shutdown()
    print(f'\n{"ALL CHECKS PASSED" if not failures else f"{len(failures)} FAILED: " + ", ".join(failures)}')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
