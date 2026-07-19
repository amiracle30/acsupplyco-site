# Google Form Two-Path Lead Capture — Design

**Date:** 2026-07-19
**Status:** Approved (conversational), ready for implementation

## Problem

Amir wants the site to drive people to his detailed Google Form
("Packaging Requirements — AC Supply Co", an 8-page intake). Today he sends it
by hand over WhatsApp after a lead comes in via the on-site short form. He also
worries that pushing the heavy form too hard loses people who aren't ready — for
them the light Web3Forms short form is easier.

## Approach — two paths, self-selected by readiness

Keep both forms and let visitors choose by commitment level:

- **Light path (unchanged):** the existing Web3Forms short quote form on `/` and
  `/contact/`. Low friction, main call to action.
- **Heavy path (new link):** a secondary link straight to the Google Form for
  people ready to give full detail. Opens in a new tab (matches "click a link
  and it takes them to it").

This resolves the tension directly: not-ready visitors keep the easy option;
ready buyers get a fast lane; and the thank-you placement automates the manual
"send the form on WhatsApp" step.

Rejected alternatives: making the Google Form the primary CTA (too much friction,
loses the not-ready visitors); embedding the form in an iframe (off-brand, 8
pages render poorly, weak tracking).

## Placements (three spots)

1. **Homepage `index.html` contact section** — a subtle divider block inside
   `.contact-form`, immediately after `</form>`: an "or" separator + secondary
   link *"Ready to get specific? Send your full packaging requirements →"*.
2. **`/contact/index.html`** — the same block, same position (identical
   `.contact-form` structure).
3. **`/thank-you/index.html`** — a highlighted "next step" card between the body
   copy and the existing `.cta-buttons`: *"Want to skip the back-and-forth? Fill
   out your full packaging requirements and I'll have everything I need."* This
   reaches every short-form lead automatically.

## Google Form URL

`https://docs.google.com/forms/d/e/1FAIpQLSdCx5zBC5EYnlYP7K4_822lmHAvjuJov8AAoq1pY2W4zbPKuA/viewform`
(drop the `?usp=header` tracking suffix). All links: `target="_blank"
rel="noopener"` and a `data-gform` attribute for tracking.

## Tracking

Add one delegated click handler to `assets/js/tracking.js` that fires a
`google_form_click` dataLayer event on clicks of any `[data-gform]` link, with
`link_url` and `page_path` — same pattern as the existing `contact_whatsapp` /
`contact_phone` / `contact_email` handlers. Wire it to a GA4 event tag in the
GTM UI (not in HTML). Document the new event in CLAUDE.md's dataLayer table.

## Design system / house rules

- Inline styles per page — reuse existing `.btn`, `--accent`, `--border`,
  `--cream` tokens; add a small `.alt-path` (main pages) and reuse card styling
  on thank-you. No dependency on legacy `main.css`.
- Clean trailing-slash internal URLs unchanged; Google Form is an external link.
- Do not touch the Web3Forms key, GTM ID, or the 400ms `/thank-you/` redirect.
- `/thank-you/` stays `noindex`; no sitemap change (no new indexable page).

## Out of scope

Prefilling the Google Form from short-form answers; changing the short form's
fields; any new on-site page.
