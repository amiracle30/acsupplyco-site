# `/bakery-packaging/` — design

**Date:** 2026-07-19
**Source:** `_seo/SEO-PLAN.md` — P2 item 6, entry 4 ("Cake / bakery boxes")
**Status:** approved, ready for implementation plan

## Why this page

Item 6 of the SEO plan lists six demand-validated product areas with no page today. Entries 1–3 are built (`/custom-branded-packaging/` personalised-cups retarget, `/catering-supplies/`, `/custom-pizza-boxes/`). Bakery is entry 4 and the next in the plan's stated sequence.

The plan left the page's shape open — "a `/bakery-packaging/` **or** `/cake-boxes/` page." Resolved: **`/bakery-packaging/` hub**. The cluster has one 100–1K term and five 10–100 terms; a hub captures all six in one page and mirrors the working `/catering-supplies/` pattern, where a narrow `/cake-boxes/` page would strand the rest and need a second build.

## Keyword targeting

Terms from `_seo/keywords-round2.csv` (a keyword list only — it carries no volume column). Volume tiers are from `_seo/SEO-PLAN.md` item 6 entry 4, which is the only place they are recorded.

| Term | Volume tier | Placement |
|---|---|---|
| `bakery packaging wholesale` | *not recorded* | title, H1, first paragraph |
| `cake boxes wholesale` | **100–1K** | first and longest cluster H2 — the money section |
| `cupcake boxes wholesale` | 10–100 | cluster H2 |
| `pastry boxes wholesale` | 10–100 | cluster H2 (shared with donut) |
| `donut boxes wholesale` | 10–100 | cluster H2 (shared with pastry) |
| `bakery bags wholesale` | *not recorded* | brief cluster H2 + cross-link (see Overlap) |

Two terms have no recorded volume — they were submitted to the Planner but their results were never written back to the plan. The hub structure does not depend on their tiers (they are framing and cross-link terms, not the money section), so this does not block the build. Worth re-checking in the Planner or against GSC at the next monthly session before leaning harder on `bakery packaging wholesale` as the H1 term.

The H1 leads on the hub term for topical framing, but `cake boxes wholesale` carries the real volume and therefore gets the prime content position and the most words.

**Metadata**

- `<title>` — `Bakery Packaging Wholesale UK — Cake Boxes & Bakery Bags | AC Supply Co.`
- `<h1>` — `Wholesale Bakery Packaging for UK Bakeries`
- Canonical / `og:url` — `https://acsupplyco.co.uk/bakery-packaging/`
- Meta description must carry no MOQ claim (see Constraints).

## Page structure

Section-for-section clone of `catering-supplies/index.html`, which is the closest existing analogue (hub, `Service` schema, sourcing model):

1. **Hero** — tag eyebrow → H1 → lede
2. **`H2` Bakery Packaging Sourced to Your Requirement** — intro prose, quote-led framing
3. **Range grid — `H2` Bakery Packaging We Source** — cake boxes, cupcake & slice boxes, pastry & donut boxes, bakery & greaseproof bags, cake drums & boards, window boxes
4. **`H2` Custom Branded Bakery Packaging** — links to `/custom-branded-packaging/`
5. **Cluster section** (`.cluster-section` / `.cluster-inner`, deep keyword prose):
   - `Cake Boxes Wholesale — UK Trade Supply`
   - `Cupcake & Cake Slice Boxes`
   - `Pastry & Donut Boxes`
   - `Bakery Bags & Greaseproof` *(brief — see Overlap)*
   - `Who Buys Bakery Packaging Through Us`
6. **Who We Supply** (`.who-section`)
7. **Quote form CTA**
8. **"You May Also Need"** cross-links
9. **Footer**

## Schema

`BreadcrumbList` + `Service` — matching `/catering-supplies/`, not the `Product` used on `/custom-pizza-boxes/`.

Rationale: SEO plan item 7 notes the priceless `Offer` on `Product` blocks rich-result eligibility and logs "Missing field 'price'" warnings in Search Console. For a quote-led wholesaler a `Service` with `areaServed: United Kingdom` fits "supplier of X" intent better and avoids fabricating a price.

## Overlap with `/paper-bags/`

SEO plan item 5 also assigns `/paper-bags/` a "kraft, brown, carrier & greaseproof/bakery bags" section. Both pages would otherwise target `bakery bags wholesale`.

**Resolution:** `/paper-bags/` is the depth page for bakery bags. This page keeps its bakery-bags treatment to a short paragraph and cross-links to `/paper-bags/`. Prevents the two pages competing on one term.

## Internal linking

- **Down:** homepage products grid → `/bakery-packaging/`
- **Across:** back-links added from `/catering-supplies/`, `/paper-bags/`, `/custom-branded-packaging/`
- **Up:** breadcrumb + "You May Also Need" pointing to the three above

## Constraints

**MOQ.** Custom-print copy must never claim low minimums or state a specific figure. Section 4 frames custom print as carrying a *higher* minimum than plain stock, confirmed on request. Applies to visible copy, `<meta>`/`og:`/`twitter:` descriptions, and any JSON-LD `description` — all three drift apart easily. See commit `86af664`, which removed these claims from `/custom-pizza-boxes/` and `/custom-branded-packaging/`.

**Stock.** Confirmed sourceable — publishes live as a normal product range, no `noindex` hold.

**House rules** (`CLAUDE.md`):

- Clone the shell: consent defaults + GTM loader first in `<head>`, GTM noscript immediately after `<body>`, `<script src="/assets/js/tracking.js" defer></script>` before `</body>`
- Full inline `<style>` block with the standard tokens — never link `/assets/css/main.css`
- Google Fonts `<link rel="stylesheet">` (preconnect alone is insufficient)
- Clean trailing-slash URLs throughout; no `.html` in any link, canonical or `og:url`
- Logo paths: `/assets/images/acsupplycologotransparant.png` visible, `/assets/images/logo-ac-supply-co.png` for `og:image`
- Add `/bakery-packaging/` to `sitemap.xml` **in the same change**, priority `0.7`, with `<lastmod>`
- Don't touch the Web3Forms key, GTM ID, or the 400ms redirect

## Out of scope

- A separate `/cake-boxes/` page — rejected in favour of the hub; revisit only if GSC later shows the hub under-serving that term
- Ice cream tubs and branded napkins (item 6 entries 5–6) — later, separate work
- The `/paper-bags/` greaseproof section itself (plan item 5) — tracked separately

## Verification

- JSON-LD validates in Rich Results Test
- Page is indexable; canonical resolves to itself
- `sitemap.xml` parses and includes the new URL
- No MOQ figure or low-minimum phrasing anywhere in the file
- Tracking block present and identical to the other pages
