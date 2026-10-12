# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML website for Packaged Proper — a UK supplier of custom-printed packaging (trading name of ACSUPPLYCO LTD, company no. 17086875; formerly AC Supply Co). Deployed via GitHub to Cloudflare Pages at https://packagedproper.co.uk. acsupplyco.co.uk, packagedproper.com and the www hosts 301 to it via Cloudflare Redirect Rules — keep those rules and the old domain permanently. No build tools, no frameworks, no CMS.

**Business contact:**
- Email: sales@packagedproper.co.uk
- Phone: +44 7440 386717
- WhatsApp: https://wa.me/447440386717
- Owner: Amir Cherifi, Managing Director

## Stack

- Pure static HTML — no npm, no build step, no compilation
- **Every page** (homepage and inner pages) is self-contained: full inline `<style>` block using the new design tokens, plus a Google Fonts `<link rel="stylesheet">` in `<head>`
- `/assets/css/main.css` exists but is **legacy and unused** — do not link new pages against it
- Shared JS lives in `/assets/js/tracking.js` (consent banner + click tracking) and is included on every page; form-specific JS is inline on the two pages with Web3Forms quote forms (`contact/`, `custom-branded-packaging/`)
- Deployed directly from this folder root via Cloudflare Pages

## Folder Structure

```
ac-supply-co/               ← Cloudflare Pages deploys from here
  index.html                ← Homepage
  404.html
  sitemap.xml
  robots.txt
  assets/images/            ← packaged-proper-logo.png, packaged-proper-og.jpg, favicon.svg, qr-code-whatsapp.png
  assets/css/main.css       ← legacy, unused — do not add new dependencies on it
  assets/js/tracking.js     ← consent banner + WhatsApp/phone/email click tracking, loaded on every page
  coffee-cups/index.html
  takeaway-packaging/index.html
  paper-bags/index.html
  custom-branded-packaging/index.html
  contact/index.html
  faq/index.html
  privacy/index.html
  thank-you/index.html
  lp/                       ← reserved for future paid landing pages
```

## URL Structure

All pages use clean directory URLs (no `.html` extensions):
- Homepage: `/`
- Product pages: `/coffee-cups/`, `/takeaway-packaging/`, `/paper-bags/`, `/custom-branded-packaging/`
- Info: `/faq/`, `/privacy/`
- Utility: `/contact/`, `/thank-you/`

## Design System

Every page carries the same design tokens inline. Copy from an existing inner page (e.g. `faq/index.html`) when creating a new one — don't invent a new palette.

```css
--bg: #FBF8F2
--paper: #FFFFFF
--cream: #F3EDE2
--cream-deep: #E9E1D2
--ink: #112E56          /* logo navy — primary text + dark surfaces */
--ink-soft: #243B5E     /* body text */
--muted: #5A6478        /* secondary text */
--light: #8A92A3
--border: #E7E0D3
--border-strong: #CBC1AE
--accent: #941A2D       /* logo burgundy — primary CTAs, prices, highlights; never WhatsApp */
--accent-deep: #6E1221
--accent-pale: #F6E7E9
--whatsapp: #25D366
--radius: 4px
--maxw: 1280px
--gutter: 32px
```

Fonts (loaded via Google Fonts `<link rel="stylesheet">` — preconnect alone is not enough):
- `Inter Tight` (300–800) — all text
- **No monospace font.** JetBrains Mono was removed site-wide on 2026-09-21 — labels, tags and uppercase eyebrows (including the `.mono` class, which keeps its name) are Inter Tight too. Don't reintroduce a second typeface or add it back to the Google Fonts link.

Shared component classes across pages: `.announcement`, `.header` / `.header-inner` / `.logo` / `.nav`, `.btn` / `.btn-ghost` / `.btn-primary` / `.btn-accent` / `.btn-whatsapp`, `.breadcrumb`, `.container`, `.tag`, `.mono`, `footer` / `.footer-grid` / `.footer-col` / `.footer-bottom`.

## Quote Forms

`contact/index.html` and `custom-branded-packaging/index.html` each contain a quote form using Web3Forms:
- Access key: `2ef0136f-1971-4072-8c61-e9450526b3ad` — do not change
- POSTs to `https://api.web3forms.com/submit` via JavaScript fetch
- On success, redirects to `/thank-you/`

The homepage has no quote form (removed 2026-09-23). Its `#contact` section, the target of the site-wide `/#contact` links, is a closing CTA pointing to `/quote/`, WhatsApp, phone and email. Homepage product-tile prices come from `/assets/js/home-products.js`, which reads `data/products/*.json` with the same exact-decimal maths as `product-page.js`.

## Image Paths

Always use absolute root-relative paths for assets:
- **Visible logo** (header + footer `<img>` on every full page): `/assets/images/packaged-proper-logo.png` (dark footers turn it white with a CSS filter)
- **Social-share image** (`og:image` on pages without a product photo): `/assets/images/packaged-proper-og.jpg`
- QR code: `/assets/images/qr-code-whatsapp.png`

Both logo files exist; do not delete either without also updating every reference.

## Rules When Adding or Editing Pages

1. **Canonicals and og:url** must use clean URLs ending in `/` — never `.html`
2. **All internal links** must use clean `/folder/` paths — never `.html` filenames
3. **thank-you page** must keep `<meta name="robots" content="noindex, nofollow">`
4. **privacy page** keeps `<meta name="robots" content="noindex, follow">`
5. **sitemap.xml** must be updated when adding new pages (except `/thank-you/` and `404.html`)
6. **robots.txt** has no Disallow — `/thank-you/` is kept out of Google by its own noindex meta, which Google can only see if crawling is allowed
7. No spaces or uppercase in any filename or folder name
8. **New pages must include the tracking block** (see Tracking & Analytics below): consent defaults + GTM loader in `<head>`, GTM noscript right after `<body>`, and `<script src="/assets/js/tracking.js" defer></script>` before `</body>`
9. **Styles are inline per page** — do not link new pages to `/assets/css/main.css`; copy the `<style>` block and shared component classes from an existing inner page instead

## Page Template Pattern

All inner pages share the same structure:
1. `<head>` with consent+GTM block (first, before anything else), SEO meta, canonical, og tags, Schema JSON-LD, Google Fonts `<link rel="stylesheet">`, and the full inline `<style>` block
2. `<body>` opens with the GTM noscript iframe
3. `.announcement` bar (dark, Inter Tight, pulse dot on the left)
4. Sticky `.header` with logo + `.nav` (Products → `/#products`, How ordering works → `/#ordering`, Why Packaged Proper → `/#how`, FAQ → `/faq/`, Contact → `/#contact`) + `.header-cta` (WhatsApp ghost + primary CTA)
5. `.breadcrumb` bar
6. Page hero — light background (`--bg`), tag eyebrow → `<h1>` → lede
7. `<main>` content sections
8. Dark `<footer>` (see shared component classes)
9. `<script src="/assets/js/tracking.js" defer></script>` immediately before `</body>`

The nav CTA on `contact/index.html` points to `/contact/` rather than `/#contact`.

## Product Pages (catalogue-driven)

Configurable product pages are **generated** — never hand-edit their HTML, and never fork the template per product.

```
data/products/<slug>.json        one record per product family — the source of truth for every word, option, variant and price
data/private/<slug>.json         GITIGNORED companion: internal notes, pricing source, review dates, minimums, catalogue map — back it up yourself
data/schema/product.schema.json  record schema (draft 2020-12); product-private.schema.json covers the companion
templates/product.html           the one shared Jinja2 template (approved design; its CSS block is frozen — additions go in the marked block below it)
assets/js/product-page.js        the one shared interaction script (gallery, option availability, exact-decimal pricing, quote form)
assets/images/products/<slug>/   build output from process-images.py (webp + jpg + thumb + manifest.json)
scripts/process-images.py        copies/normalises photography from ~/Downloads/Product Images (or repo: masters)
scripts/build-products.py        validate → render → write pages → sitemap + category blocks   (--check writes nothing)
scripts/import-catalogue.py      pulls tiers + multipliers from the master catalogue; prints a diff, writes only with --apply
scripts/test-product-pages.py    Playwright checks (local only)
```

- Cloudflare has no build step: run `process-images.py`, then `build-products.py`, then **commit the generated HTML**. Needs Python 3 + jinja2 + Pillow (openpyxl only for the .xlsx import; Playwright only for the tests).
- `status` decides output: `draft` renders nowhere; `preview` → `preview/<slug>/` (noindex, not in sitemap); `published` → `<category>/<slug>/`, added to `sitemap.xml` and to the category page.
- The build owns everything between `<!-- products:start -->` and `<!-- products:end -->` in `sitemap.xml` and the six category pages. Don't edit inside those markers.
- **`data/products/*.json` is publicly served** (deploy is from repo root). Anything commercially sensitive — `internal`, pricing `source`, `review_date`, `min_qty`, `increment` — goes in `data/private/<slug>.json`, which is gitignored and merged in memory by `productlib.load_records()`. The public schema rejects those keys, and the build also greps rendered HTML for them (plus catalogue `floor`/`notes`) and fails. Only confirmed multipliers are priced; anything the catalogue marks ESTIMATE is `available:false` + `quote_only`.
- Prices are decimal strings, never floats. Python (`Decimal`) and the browser (`BigInt`) must agree to the penny — `test-product-pages.py` checks every tier card.
- **Galleries show custom-printed product shots only.** No blank/plain product photos, no generic "print inspiration" images, and no fictional brand names in visible labels — each image is a `role: "hero"` entry matched to the size it actually shows. A size with one image hides the thumbnail strip automatically.

## Tracking & Analytics

Client-side tracking is centralised through one Google Tag Manager container. Site pages **never** contain direct `gtag`, `fbq`, or Ads snippets — all tags live inside the GTM container and are fired by dataLayer events.

- **GTM container:** `GTM-MR747W4P` (hardcoded in every page's head + noscript block)
- **GA4 property:** Measurement ID `G-8CHHWEDWWK`. The Google Tag inside GTM references this ID; the site itself never mentions it directly. GA4 event tags fire on the corresponding custom-event triggers: `generate_lead` (sends ecommerce data, so leads carry `value`/`currency`/`items`), `contact_whatsapp`, `contact_phone`, `contact_email`, `google_form_click`, plus the `AC -` tags from the funnel import — one `AC - GA4 - ecommerce funnel` tag sends `view_item`, `select_item`, `add_to_cart`, `view_cart`, `remove_from_cart`, `begin_checkout` as `{{Event}}` with ecommerce data, and one tag each for `select_quantity`, `request_custom_quantity`, `update_cart_qty`, `form_error`. Their event parameters are registered as GA4 custom dimensions (`tier_qty` as a metric).
- **Meta Pixel:** ID `1069048138932330`. Lives entirely inside GTM as Custom HTML tags — `Meta Pixel — Base` (`fbq('init'/'track','PageView')`) fires on All Pages **and** `cookie_consent_update`, *Once per event*, with a `window.acMetaPageView` guard so PageView goes once per page (Once per page would leave it dead on the page where the visitor clicks Accept, since it was consent-blocked at load); `Meta Pixel — Lead` on `generate_lead` (re-inits with hashed email/phone; sends `value`/GBP); and `AC - Meta - ViewContent` (on `view_item` and `view_item_consented`), `AC - Meta - AddToCart`, `AC - Meta - InitiateCheckout`. All carry GTM Consent Settings requiring `ad_storage`, because Consent Mode does not govern non-Google tags automatically. No `fbq` snippet belongs in page HTML. Meta's own `FB_CONVERSIONS_API-…-Pixel_Template` tag (added by Events Manager's GTM setup) is **paused**: it hard-codes "Consent Granted" and ignored the banner, and its GA4 dataLayer integration double-counted the events above. Automatic advanced matching is off in Events Manager (it was reading the hidden `from_name` field as every visitor's name).
- **Consent Mode v2:** all four ad/analytics signals default to `denied`. The banner in `tracking.js` calls `gtag('consent', 'update', ...)` when the user accepts or rejects, and persists the choice in `localStorage` under `ac_consent`.
- **Consent restore runs in the head, not in `tracking.js`.** The inline head block reads `localStorage.ac_consent` and pushes the `consent update` immediately after the defaults and *before* the GTM snippet. This is required: `tracking.js` is `defer`red, so its update lands in the dataLayer queue *after* the `gtm.js` event, and GTM has already evaluated (and permanently dropped) consent-gated tags by then — which is what silently killed the Meta Pixel. Keep this block in the head of every page; never move consent restoration into a deferred script.
- **Privacy notice:** `/privacy/` documents what runs before/after consent — update it when adding a new pixel or processor.

### dataLayer events pushed by site code

| Event | Where | Parameters |
|---|---|---|
| `generate_lead` | Quote-form success on `contact/index.html`, `custom-branded-packaging/index.html`, the quote dialog on every generated product page (`assets/js/product-page.js`), and the quote-basket submit on `/quote/` (`assets/js/quote-page.js`) | `form_id` (`contact` \| `custom` \| `product` \| `cart`), `lead_type: 'quote_request'`, `user_email`, `user_phone`; product pages add `product_id`; product + cart add `value`, `currency: 'GBP'` and `ecommerce.items` (cart also `item_count`) |
| `contact_whatsapp` | Delegated click on any `wa.me/…` link (all pages) | `link_url`, `page_path` |
| `contact_phone` | Delegated click on any `tel:` link (all pages) | `link_url`, `page_path` |
| `contact_email` | Delegated click on any `mailto:` link (all pages) | `link_url`, `page_path` |
| `google_form_click` | Delegated click on any `[data-gform]` link or `docs.google.com/forms` URL — the "full packaging requirements" Google Form links on `contact/index.html`, `thank-you/index.html` | `link_url`, `page_path` |
| `cookie_consent_update` | Banner accept/reject, **and on every page load** when a saved choice is restored | `consent_action` (`accept` \| `reject`) |
| `view_item` | Product page load (`product-page.js`) | `ecommerce`: `currency`, `value`, `items[]` for the default configuration |
| `view_item_consented` | Visitor clicks Accept on a product page (`tracking.js` calls `window.acOnConsent`) — Meta-only resend of the consent-blocked `view_item`; GA4 does not listen for it | same as `view_item` |
| `select_item` | Delegated click on a homepage product tile or category-page card (`tracking.js`) | `ecommerce`: `item_list_id`/`item_list_name`, `items[]` with `index` |
| `select_quantity` | Price-break tier click | `product_id`, `variant_sku`, `tier_qty`, `value`, `currency` |
| `request_custom_quantity` | "Request a custom quantity" | `product_id`, `variant_sku` |
| `add_to_cart` | "Add to quote" (replaced `add_to_quote`) | `ecommerce`: `currency`, `value`, `items[]` |
| `view_cart` | `/quote/` load with lines (`quote-page.js`) | `ecommerce`: `currency`, `value`, `items[]` |
| `update_cart_qty` | Basket quantity change | `product_id`, `variant_sku`, `previous_qty`, `new_qty` (number or `custom`), `value`, `currency` |
| `remove_from_cart` | Basket Remove | `ecommerce`: `currency`, `value`, `items[]` |
| `begin_checkout` | First focus in the basket form, or the product quote dialog opening (once per page) | `form_id` (`cart` \| `product`), `ecommerce` |
| `form_error` | Web3Forms failure on any quote form | `form_id`, `error_type` (`rejected` \| `network`); custom page adds `form_location` (`main` \| `hero`) |

### Rules when adding tracking

- New business events go in the dataLayer with snake_case names; wire them to platforms in the GTM UI, not in HTML. Push them through `window.acTrack(event, params)` in `tracking.js` — it clears the previous `ecommerce` object first; `acItem(line)` turns a quote-basket line into a GA4 item. Use GA4's recommended ecommerce names where one exists. Prices in these events are analytics-only floats; the pages still price with exact decimals.
- If you add a new pixel/tag inside GTM, update `/privacy/` to name it and its category.
- Never remove the 400ms `setTimeout` around the `/thank-you/` redirect in the form handlers — it gives tags time to send before navigation.
