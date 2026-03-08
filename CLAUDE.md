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
- All CSS is inline per-file (no external stylesheet yet)
- JavaScript is minimal and inline (only on pages with forms)
- Deployed directly from this folder root via Cloudflare Pages

## Folder Structure

```
ac-supply-co/               ← Cloudflare Pages deploys from here
  index.html                ← Homepage
  sitemap.xml
  robots.txt
  assets/images/            ← logo-ac-supply-co.png, qr-code-whatsapp.png
  assets/css/               ← reserved for future shared stylesheet
  assets/js/                ← reserved for future shared scripts
  coffee-cups/index.html
  takeaway-packaging/index.html
  paper-bags/index.html
  custom-branded-packaging/index.html
  contact/index.html
  thank-you/index.html
  lp/                       ← reserved for future paid landing pages
```

## URL Structure

All pages use clean directory URLs (no `.html` extensions):
- Homepage: `/`
- Product pages: `/coffee-cups/`, `/takeaway-packaging/`, `/paper-bags/`, `/custom-branded-packaging/`
- Utility: `/contact/`, `/thank-you/`

## Design System

All CSS is duplicated per page. The shared variables are:

```css
--navy: #0f1f3d
--navy-light: #1a3260
--green: #2e7d52
--green-light: #3a9966
--green-pale: #e8f5ee
--white: #ffffff
--off-white: #f7f8fa
--border: #e2e6ec
```

Fonts: `Playfair Display` (headings) + `DM Sans` (body) via Google Fonts.

## Quote Forms

Both `index.html` and `contact/index.html` contain a quote form using Web3Forms:
- Access key: `2ef0136f-1971-4072-8c61-e9450526b3ad` — do not change
- POSTs to `https://api.web3forms.com/submit` via JavaScript fetch
- On success, redirects to `/thank-you/`

## Image Paths

Always use absolute root-relative paths for assets:
- Logo: `/assets/images/logo-ac-supply-co.png`
- QR code: `/assets/images/qr-code-whatsapp.png`

## Rules When Adding or Editing Pages

1. **Canonicals and og:url** must use clean URLs ending in `/` — never `.html`
2. **All internal links** must use clean `/folder/` paths — never `.html` filenames
3. **Logo src** must always be `/assets/images/logo-ac-supply-co.png`
4. **thank-you page** must keep `<meta name="robots" content="noindex, nofollow">`
5. **sitemap.xml** must be updated when adding new pages
6. **robots.txt** Disallow stays as `/thank-you/`
7. No spaces or uppercase in any filename or folder name

## Page Template Pattern

All inner pages share the same structure:
1. `<head>` with SEO meta, canonical, og tags, Schema JSON-LD, Google Fonts, inline `<style>`
2. Sticky `<header>` with logo + nav (Products → `/#products`, Custom Branding → `/custom-branded-packaging/`, Contact → `/contact/`, CTA → `/#contact`)
3. Breadcrumb bar
4. `.page-hero` (navy background)
5. `<main>` content sections
6. `<footer>`

The nav CTA on `contact/index.html` points to `/contact/` rather than `/#contact`.
