#!/usr/bin/env python3
"""Integrate the approved site header (header.html) into every page.

    python3 scripts/apply-header.py          # rewrite pages; then run build-products.py

header.html is the design reference: its <style> becomes an inline <style data-site-header>
block in each page's <head>, its <header> replaces the page's announcement bar + old header,
and its <script> is written once to assets/js/site-header.js (loaded with defer after the
header). Idempotent: re-running replaces the previously inserted pieces. The product
template gets data-current="{{ nav_section }}", which build-products.py fills per record.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'header.html'
JS_OUT = ROOT / 'assets/js/site-header.js'
STYLE_TAG = '<style data-site-header>'
SCRIPT_TAG = '<script src="/assets/js/site-header.js" defer></script>'
BASKET_TAG = '<script src="/assets/js/quote-basket.js" defer></script>'

# Static pages and the data-current section each one highlights.
PAGES = {
    'index.html': '', '404.html': '', 'privacy/index.html': '', 'thank-you/index.html': '',
    'faq/index.html': 'faq', 'contact/index.html': 'contact',
    'coffee-cups/index.html': 'hot-cups', 'takeaway-packaging/index.html': 'boxes',
    'paper-bags/index.html': 'bags', 'bakery-packaging/index.html': '',
    'custom-pizza-boxes/index.html': 'boxes', 'catering-supplies/index.html': 'table-print',
    'custom-branded-packaging/index.html': 'all-products',
    'guides/index.html': 'guides', 'guides/compostable-vs-recyclable-coffee-cups/index.html': 'guides',
    'quote/index.html': 'quote',
    'templates/product.html': '{{ nav_section }}',
}

# Compatibility rules for page styles that would otherwise bleed into the header
# (element-level details/summary/h2 rules, and the sticky product gallery).
COMPAT = ('.hdr-root details{border:0;padding:0;margin:0}.hdr-root summary{font-size:inherit}'
          '.hdr-root h2{font-size:18px;margin:0}.hdr-root ul{margin:0}'
          '.gallery{top:168px}')

OLD_BLOCK = re.compile(r'(?:<!-- ANNOUNCEMENT[^>]*-->\s*)?<div class="announcement">.*?</header>\s*', re.S)


def parts():
    src = SOURCE.read_text(encoding='utf-8')
    body = src[src.index('</head>'):]                      # skip the preview-only head + its comment
    css = re.search(r'\n<style>\n(.*?)\n</style>', src, re.S).group(1).strip()
    header = re.search(r'<header class="hdr-root".*?</header>', body, re.S).group()
    script = re.search(r'\n<script>\n(.*?)\n</script>', body, re.S).group(1).strip()
    assert css.startswith('.hdr-root') and script.startswith('(() =>'), 'header.html layout changed — check the extraction'
    return css, header, script


def apply(path, section, css, header):
    text = path.read_text(encoding='utf-8')
    crlf = '\r\n' in text
    text = text.replace('\r\n', '\n')
    # 1. header markup (replace the old announcement+header, or a previously inserted new header)
    new_header = header.replace('data-current=""', f'data-current="{section}"', 1)
    if '<header class="hdr-root"' in text:
        text = re.sub(r'<header class="hdr-root".*?</header>', lambda m: new_header, text, count=1, flags=re.S)
    else:
        assert OLD_BLOCK.search(text), f'{path}: no announcement/header block found'
        text = OLD_BLOCK.sub(new_header + '\n', text, count=1)
    # 2. styles
    block = f'{STYLE_TAG}\n{css}\n{COMPAT}\n</style>\n'
    if STYLE_TAG in text:
        text = re.sub(re.escape(STYLE_TAG) + r'.*?</style>\n', lambda m: block, text, count=1, flags=re.S)
    else:
        text = text.replace('</head>', block + '</head>', 1)
    # 3. script, right after the header
    if SCRIPT_TAG not in text:
        text = text.replace('</header>\n', '</header>\n' + SCRIPT_TAG + '\n', 1)
    # 4. the basket store fills the cart badge on every page
    if BASKET_TAG not in text:
        text = text.replace('<script src="/assets/js/tracking.js" defer></script>', BASKET_TAG + '\n<script src="/assets/js/tracking.js" defer></script>', 1)
    if crlf:
        text = text.replace('\n', '\r\n')
    path.write_text(text, encoding='utf-8')


def main():
    css, header, script = parts()
    JS_OUT.write_text('/* Site header behaviour — generated from header.html by scripts/apply-header.py. Edit header.html, not this file. */\n' + script + '\n', encoding='utf-8')
    for rel, section in PAGES.items():
        apply(ROOT / rel, section, css, header)
        print(f'  header → {rel}  (data-current="{section}")')
    print(f'  script → {JS_OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    try:
        main()
    except AssertionError as err:
        sys.exit(f'HEADER INTEGRATION FAILED\n{err}')
