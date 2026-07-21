# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML website for AC Supply Co. — a UK wholesale packaging supplier. Deployed via GitHub to Cloudflare Pages at https://acsupplyco.co.uk. No build tools, no frameworks, no CMS.

**Business contact:**
- Email: sales@acsupplyco.co.uk
- Phone: +44 7440 386717
- WhatsApp: https://wa.me/447440386717
- Owner: Amir Cherifi, Managing Director

## Stack

- Pure static HTML — no npm, no build step, no compilation
- **Every page** (homepage and inner pages) is self-contained: full inline `<style>` block using the new design tokens, plus a Google Fonts `<link rel="stylesheet">` in `<head>`
- `/assets/css/main.css` exists but is **legacy and unused** — do not link new pages against it
- Shared JS lives in `/assets/js/tracking.js` (consent banner + click tracking) and is included on every page; form-specific JS is inline on the two pages with quote forms
- Deployed directly from this folder root via Cloudflare Pages

## Folder Structure

```
ac-supply-co/               ← Cloudflare Pages deploys from here
  index.html                ← Homepage
  404.html
  sitemap.xml
  robots.txt
  assets/images/            ← logo-ac-supply-co.png, qr-code-whatsapp.png
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
--bg: #FAFAF7
--paper: #FFFFFF
--cream: #F1ECE0
--cream-deep: #E8E2D2
--ink: #0F1F3D          /* primary text + dark surfaces */
--ink-soft: #1F2D4D     /* body text */
--muted: #5A6478        /* secondary text */
--light: #8A92A3
--border: #E5E1D8
--border-strong: #C9C2B0
--accent: #1F6B43       /* green — links, primary CTAs on light bg */
--accent-deep: #164C30
--accent-pale: #E8F0EA
--whatsapp: #25D366
--radius: 4px
--maxw: 1280px
--gutter: 32px
```

Fonts (loaded via Google Fonts `<link rel="stylesheet">` — preconnect alone is not enough):
- `Inter Tight` (300–800) — all text
- `JetBrains Mono` (400–500) — mono labels, tags, uppercase eyebrows

Shared component classes across pages: `.announcement`, `.header` / `.header-inner` / `.logo` / `.nav`, `.btn` / `.btn-ghost` / `.btn-primary` / `.btn-accent` / `.btn-whatsapp`, `.breadcrumb`, `.container`, `.tag`, `.mono`, `footer` / `.footer-grid` / `.footer-col` / `.footer-bottom`.

## Quote Forms

`index.html`, `contact/index.html`, and `custom-branded-packaging/index.html` each contain a quote form using Web3Forms:
- Access key: `2ef0136f-1971-4072-8c61-e9450526b3ad` — do not change
- POSTs to `https://api.web3forms.com/submit` via JavaScript fetch
- On success, redirects to `/thank-you/`

## Image Paths

Always use absolute root-relative paths for assets:
- **Visible logo** (header + footer `<img>` on every full page): `/assets/images/acsupplycologotransparant.png`
- **Social-share logo** (`og:image` meta tag only): `/assets/images/logo-ac-supply-co.png`
- QR code: `/assets/images/qr-code-whatsapp.png`

Both logo files exist; do not delete either without also updating every reference.

## Rules When Adding or Editing Pages

1. **Canonicals and og:url** must use clean URLs ending in `/` — never `.html`
2. **All internal links** must use clean `/folder/` paths — never `.html` filenames
3. **thank-you page** must keep `<meta name="robots" content="noindex, nofollow">`
4. **privacy page** keeps `<meta name="robots" content="noindex, follow">`
5. **sitemap.xml** must be updated when adding new pages (except `/thank-you/` and `404.html`)
6. **robots.txt** Disallow stays as `/thank-you/`
7. No spaces or uppercase in any filename or folder name
8. **New pages must include the tracking block** (see Tracking & Analytics below): consent defaults + GTM loader in `<head>`, GTM noscript right after `<body>`, and `<script src="/assets/js/tracking.js" defer></script>` before `</body>`
9. **Styles are inline per page** — do not link new pages to `/assets/css/main.css`; copy the `<style>` block and shared component classes from an existing inner page instead

## Page Template Pattern

All inner pages share the same structure:
1. `<head>` with consent+GTM block (first, before anything else), SEO meta, canonical, og tags, Schema JSON-LD, Google Fonts `<link rel="stylesheet">`, and the full inline `<style>` block
2. `<body>` opens with the GTM noscript iframe
3. `.announcement` bar (dark, JetBrains Mono, pulse dot on the left)
4. Sticky `.header` with logo + `.nav` (Products → `/#products`, How ordering works → `/#ordering`, Why AC Supply Co → `/#how`, FAQ → `/faq/`, Contact → `/#contact`) + `.header-cta` (WhatsApp ghost + primary CTA)
5. `.breadcrumb` bar
6. Page hero — light background (`--bg`), tag eyebrow → `<h1>` → lede
7. `<main>` content sections
8. Dark `<footer>` (see shared component classes)
9. `<script src="/assets/js/tracking.js" defer></script>` immediately before `</body>`

The nav CTA on `contact/index.html` points to `/contact/` rather than `/#contact`.

## Tracking & Analytics

Client-side tracking is centralised through one Google Tag Manager container. Site pages **never** contain direct `gtag`, `fbq`, or Ads snippets — all tags live inside the GTM container and are fired by dataLayer events.

- **GTM container:** `GTM-MR747W4P` (hardcoded in every page's head + noscript block)
- **GA4 property:** Measurement ID `G-8CHHWEDWWK`. The Google Tag inside GTM references this ID; the site itself never mentions it directly. Four GA4 event tags (`generate_lead`, `contact_whatsapp`, `contact_phone`, `contact_email`) fire on the corresponding custom-event triggers.
- **Consent Mode v2:** all four ad/analytics signals default to `denied`. The banner in `tracking.js` calls `gtag('consent', 'update', ...)` when the user accepts or rejects, and persists the choice in `localStorage` under `ac_consent`.
- **Privacy notice:** `/privacy/` documents what runs before/after consent — update it when adding a new pixel or processor.

### dataLayer events pushed by site code

| Event | Where | Parameters |
|---|---|---|
| `generate_lead` | Quote-form success on `index.html`, `contact/index.html`, and `custom-branded-packaging/index.html` | `form_id` (`home` \| `contact` \| `custom`), `lead_type: 'quote_request'`, `user_email`, `user_phone` |
| `contact_whatsapp` | Delegated click on any `wa.me/…` link (all pages) | `link_url`, `page_path` |
| `contact_phone` | Delegated click on any `tel:` link (all pages) | `link_url`, `page_path` |
| `contact_email` | Delegated click on any `mailto:` link (all pages) | `link_url`, `page_path` |
| `google_form_click` | Delegated click on any `[data-gform]` link or `docs.google.com/forms` URL — the "full packaging requirements" Google Form links on `index.html`, `contact/index.html`, `thank-you/index.html` | `link_url`, `page_path` |
| `cookie_consent_update` | Banner accept/reject | `consent_action` (`accept` \| `reject`) |

### Rules when adding tracking

- New business events go in the dataLayer with snake_case names; wire them to platforms in the GTM UI, not in HTML.
- If you add a new pixel/tag inside GTM, update `/privacy/` to name it and its category.
- Never remove the 400ms `setTimeout` around the `/thank-you/` redirect in the form handlers — it gives tags time to send before navigation.
