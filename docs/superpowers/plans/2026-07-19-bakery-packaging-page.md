# /bakery-packaging/ Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/bakery-packaging/` hub page targeting the bakery keyword cluster, wired into the sitemap and internal links.

**Architecture:** A single self-contained static HTML file cloned structurally from `catering-supplies/index.html` — the closest existing analogue (hub page, `Service` schema, sourcing model). Every page on this site carries its own inline `<style>` block and tracking block; there is no shared CSS or template to extend. The clone is therefore literal: copy the boilerplate line ranges verbatim, then replace the content regions.

**Tech Stack:** Pure static HTML. No build step, no framework, no npm install required at runtime. Deployed from repo root via Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-07-19-bakery-packaging-page-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **MOQ copy rule (business-critical):** never claim low minimums for custom print, and never state a specific MOQ figure. Frame custom print as carrying a *higher* minimum than plain stock, confirmed on request. Applies to visible copy, `<meta>`/`og:`/`twitter:` descriptions, and JSON-LD `description` fields alike. Precedent: commit `86af664`.
- **URLs:** clean trailing-slash paths only (`/bakery-packaging/`). Never `.html` in any link, `canonical`, or `og:url`.
- **Styles:** full inline `<style>` block. Never link `/assets/css/main.css` (legacy, unused).
- **Tracking block, all three parts required:** consent defaults + GTM loader first in `<head>`; GTM noscript iframe immediately after `<body>`; `<script src="/assets/js/tracking.js" defer></script>` immediately before `</body>`. GTM ID is `GTM-MR747W4P`.
- **Images:** visible logo `/assets/images/acsupplycologotransparant.png`; `og:image` uses `/assets/images/logo-ac-supply-co.png`. These are different files — do not swap them.
- **Do not touch:** the Web3Forms access key, the GTM container ID, or the 400ms redirect timeout in form handlers.
- **Filenames:** no spaces, no uppercase.

### Validation baseline (read before writing any verification step)

`npx html-validate` with default config reports **19 pre-existing errors on every page in this repo**, spanning exactly four rules:

| Rule | Cause | Expected? |
|---|---|---|
| `void-style` | Site writes `<meta … />` self-closing | Yes — house style |
| `element-required-attributes` | GTM `<noscript><iframe>` has no `title` | Yes — GTM boilerplate |
| `no-inline-style` | Same GTM iframe's `style="display:none…"` | Yes — GTM boilerplate |
| `tel-non-breaking` | Spaces inside the phone number | Yes — house style |

**Do not "fix" these and do not assert that validation passes.** The gate is: *the new page reports no error from any rule outside those four.* A fifth rule name appearing means a real bug (unclosed tag, bad nesting, missing alt).

---

## File Structure

| File | Responsibility |
|---|---|
| `bakery-packaging/index.html` | **Create.** The entire page — head, styles, content, footer. Self-contained by site convention. |
| `sitemap.xml` | **Modify.** Add the new URL. |
| `index.html` | **Modify.** Homepage products grid → link to new page. |
| `catering-supplies/index.html` | **Modify.** Related-categories cross-link. |
| `paper-bags/index.html` | **Modify.** Related-categories cross-link. |
| `custom-branded-packaging/index.html` | **Modify.** Related-categories cross-link. |

Source of all boilerplate: `catering-supplies/index.html`, whose regions are:

| Lines | Region | Treatment |
|---|---|---|
| 1–82 | Consent + GTM + SEO meta + schema + fonts | Copy, then replace meta & schema (Task 1) |
| 83–249 | `<style>` block | Copy verbatim |
| 251–255 | `<body>` open + GTM noscript | Copy verbatim |
| 256–286 | Announcement + header | Copy verbatim |
| 287–294 | Breadcrumb | Copy, change label (Task 1) |
| 296–482 | Page content | Replace entirely (Tasks 2–3) |
| 483–521 | Footer | Copy verbatim |
| 522–523 | tracking.js + `</body>` | Copy verbatim |

---

### Task 1: Page scaffold, head, and breadcrumb

**Files:**
- Create: `bakery-packaging/index.html`
- Read: `catering-supplies/index.html:1-295`, `:483-524`

**Interfaces:**
- Consumes: nothing.
- Produces: a valid page skeleton whose content region (between the breadcrumb `</div>` and `<!-- FOOTER -->`) is empty, ready for Tasks 2–3. All CSS class names used by later tasks are defined in the copied `<style>` block: `.page-hero`, `.page-hero-inner`, `.page-hero-left`, `.page-hero-right`, `.page-hero-actions`, `.detail-section`, `.detail-grid`, `.detail-copy`, `.detail-list`, `.detail-list-head`, `.variants-section`, `.variants-inner`, `.variants-head`, `.variant-grid`, `.variant-card`, `.variant-card-num`, `.custom-band`, `.custom-band-inner`, `.custom-band-actions`, `.cluster-section`, `.cluster-inner`, `.who-section`, `.who-inner`, `.who-grid`, `.who-copy`, `.cta-band`, `.cta-band-inner`, `.cta-band-actions`, `.related-section`, `.related-inner`, `.related-grid`, `.related-card`, `.related-card-num`, `.arrow`, `.tag`, `.mono`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-accent`, `.btn-whatsapp`.

- [ ] **Step 1: Create the directory and copy the source page**

```bash
mkdir -p bakery-packaging
cp catering-supplies/index.html bakery-packaging/index.html
```

- [ ] **Step 2: Delete the content region, leaving the boilerplate**

Open `bakery-packaging/index.html`. Delete every line from `<!-- PAGE HERO -->` up to but **not** including `<!-- FOOTER -->`. In the freshly copied file these are lines 296–482.

Verify the surgery left the seams intact:

```bash
grep -n -E "<!-- BREADCRUMB|<!-- FOOTER|tracking.js" bakery-packaging/index.html
```

Expected: three matches, breadcrumb before footer before tracking.js, and no `<!-- PAGE HERO -->` match.

- [ ] **Step 3: Replace the SEO meta block**

Replace the `<title>`, `<meta name="description">`, and `<link rel="canonical">` (lines 30–32 in the copy):

```html
  <title>Bakery Packaging Wholesale UK &mdash; Cake Boxes &amp; Bakery Bags | AC Supply Co.</title>
  <meta name="description" content="Wholesale bakery packaging for UK bakeries — cake boxes, cupcake and pastry boxes, donut boxes and bakery bags. Direct trade sourcing, UK-wide delivery. Get a quote." />
  <link rel="canonical" href="https://acsupplyco.co.uk/bakery-packaging/" />
```

Note the description carries **no MOQ claim** — see Global Constraints.

- [ ] **Step 4: Replace the Open Graph and Twitter blocks**

```html
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://acsupplyco.co.uk/bakery-packaging/" />
  <meta property="og:title" content="Bakery Packaging Wholesale UK &mdash; Cake Boxes &amp; Bakery Bags | AC Supply Co." />
  <meta property="og:description" content="Wholesale bakery packaging for UK bakeries — cake boxes, cupcake and pastry boxes, donut boxes and bakery bags. Direct trade sourcing, UK-wide delivery." />
  <meta property="og:image" content="https://acsupplyco.co.uk/assets/images/logo-ac-supply-co.png" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Bakery Packaging Wholesale UK &mdash; Cake Boxes &amp; Bakery Bags | AC Supply Co." />
  <meta name="twitter:description" content="Wholesale bakery packaging for UK bakeries — cake boxes, cupcake and pastry boxes, donut boxes and bakery bags. Direct trade sourcing, UK-wide delivery." />
  <meta name="twitter:image" content="https://acsupplyco.co.uk/assets/images/logo-ac-supply-co.png" />
```

- [ ] **Step 5: Replace the BreadcrumbList and Service schema**

Replace both `<script type="application/ld+json">` blocks (the `BreadcrumbList` and the `Service`) with:

```html
  <!-- Schema: BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://acsupplyco.co.uk/"},
      {"@type": "ListItem", "position": 2, "name": "Bakery Packaging", "item": "https://acsupplyco.co.uk/bakery-packaging/"}
    ]
  }
  </script>

  <!-- Schema: Service -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Wholesale Bakery Packaging Supply",
    "serviceType": "Bakery packaging wholesale",
    "description": "Trade sourcing of bakery packaging for UK bakeries — cake boxes, cupcake and cake slice boxes, pastry and donut boxes, bakery bags, cake drums and boards.",
    "provider": {
      "@type": "Organization",
      "name": "AC Supply Co.",
      "url": "https://acsupplyco.co.uk"
    },
    "areaServed": { "@type": "Country", "name": "United Kingdom" }
  }
  </script>
```

`Service` not `Product` — deliberate. See spec § Schema.

- [ ] **Step 6: Update the breadcrumb label**

Change the breadcrumb's trailing `<span>`:

```html
    <a href="/">Home</a>
    <span>›</span>
    <span>Bakery Packaging</span>
```

- [ ] **Step 7: Verify the JSON-LD parses**

```bash
python3 - <<'PY'
import json, re, pathlib
html = pathlib.Path("bakery-packaging/index.html").read_text()
blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
print(f"found {len(blocks)} JSON-LD blocks")
for i, b in enumerate(blocks, 1):
    d = json.loads(b)
    print(f"  {i}. @type={d['@type']}")
PY
```

Expected:
```
found 2 JSON-LD blocks
  1. @type=BreadcrumbList
  2. @type=Service
```

A `json.decoder.JSONDecodeError` means a trailing comma or unescaped quote — fix before continuing.

- [ ] **Step 8: Verify the tracking block and constraint compliance**

```bash
grep -c "GTM-MR747W4P" bakery-packaging/index.html          # expect 2
grep -c "tracking.js" bakery-packaging/index.html            # expect 1
grep -c "acsupplycologotransparant" bakery-packaging/index.html  # expect 2
grep -c "main.css" bakery-packaging/index.html               # expect 0
grep -c "catering" bakery-packaging/index.html               # expect 0 — stale clone text
grep -nE "href=\"[^\"]*\.html\"" bakery-packaging/index.html # expect no output
```

`grep -c` returning 0 exits non-zero; that is fine for the two zero-expected checks.

- [ ] **Step 9: Verify no new validation errors**

```bash
npx --yes html-validate bakery-packaging/index.html 2>&1 | grep -oE "[a-z-]+$" | sort -u
```

Expected: only rule names from the baseline four (`void-style`, `element-required-attributes`, `no-inline-style`, `tel-non-breaking`) plus URL fragments from the trailing "More information" block. Any other rule name is a real bug — fix it.

- [ ] **Step 10: Commit**

```bash
git add bakery-packaging/index.html
git commit -m "feat: scaffold /bakery-packaging/ page shell with head and schema"
```

---

### Task 2: Hero, intro, range grid, custom-branding band

**Files:**
- Modify: `bakery-packaging/index.html` — insert between the breadcrumb `</div>` and `<!-- FOOTER -->`

**Interfaces:**
- Consumes: the scaffold and CSS classes from Task 1.
- Produces: the upper page content. Task 3 appends directly below the `<!-- CUSTOM BAND -->` block this task ends with.

- [ ] **Step 1: Insert the page hero**

Insert immediately after the breadcrumb's closing `</div>`:

```html
<!-- PAGE HERO -->
<div class="page-hero">
  <div class="page-hero-inner">
    <div class="page-hero-left">
      <span class="tag mono">Bakery Packaging Wholesale UK</span>
      <h1>Wholesale Bakery Packaging for UK Bakeries</h1>
    </div>
    <div class="page-hero-right">
      <p>Direct trade sourcing of bakery packaging for UK bakeries, patisseries, cake makers and coffee shops — cake boxes, cupcake and pastry boxes, donut boxes, bakery bags and boards. Nationwide delivery, London included.</p>
      <div class="page-hero-actions">
        <a href="/#contact" class="btn btn-primary">Request a Quote</a>
        <a href="https://wa.me/447440386717" class="btn btn-ghost" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Insert the detail section**

```html
<!-- DETAIL SECTION -->
<div class="detail-section">
  <div class="detail-grid">
    <div class="detail-copy">
      <h2>Bakery Packaging Sourced to Your Requirement</h2>
      <p>AC Supply Co. supplies UK bakeries with the boxes, bags and boards their products go out in — sourced directly at trade prices. Bakery packaging is unusually spec-sensitive: a cake box that's 10mm short ruins the product, and a greaseproof that's wrong lets butter through the bag by the time it reaches the customer. So we source against your actual products and volumes rather than pushing a fixed catalogue.</p>
      <p>That makes us a good fit if you're a bakery, patisserie, cake maker, doughnut shop or café that sells baked goods to take away and buys packaging in volume. Send us your sizes — or a photo of what you currently use — and we'll come back with pricing, usually the same day.</p>
      <p>Custom branded bakery packaging is available too. <a href="/custom-branded-packaging/">See our custom packaging page</a> for the printed side of the range.</p>
    </div>
    <div>
      <p class="detail-list-head">What We Source</p>
      <ul class="detail-list">
        <li>Cake boxes in standard and deep sizes</li>
        <li>Cupcake and cake slice boxes</li>
        <li>Pastry, donut and cookie boxes</li>
        <li>Window boxes for display</li>
        <li>Cake drums, boards and inserts</li>
        <li>Bakery bags and greaseproof papers</li>
        <li>Custom printed bakery packaging</li>
        <li>UK-wide delivery, London included</li>
      </ul>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Insert the range grid**

```html
<!-- VARIANTS SECTION -->
<div class="variants-section">
  <div class="variants-inner">
    <div class="variants-head">
      <div>
        <span class="tag mono">Bakery Categories</span>
        <h2>Bakery Packaging We Source</h2>
      </div>
      <p>The range UK bakeries typically buy from us. If your product needs a size or format not covered here, ask — we source across the trade.</p>
    </div>
    <div class="variant-grid">
      <div class="variant-card">
        <div class="variant-card-num">01</div>
        <h4>Cake Boxes</h4>
        <p>Standard and deep cake boxes across the usual 6", 8", 10" and 12" footprints, plus tall boxes for layered and celebration cakes. Plain white, kraft and windowed.</p>
      </div>
      <div class="variant-card">
        <div class="variant-card-num">02</div>
        <h4>Cupcake &amp; Slice Boxes</h4>
        <p>Single, four-hole, six-hole and twelve-hole cupcake boxes with inserts, plus individual cake slice and dessert boxes for counter sales.</p>
      </div>
      <div class="variant-card">
        <div class="variant-card-num">03</div>
        <h4>Pastry &amp; Donut Boxes</h4>
        <p>Flat pastry boxes, donut boxes in half-dozen and dozen formats, and cookie or brownie boxes. Kraft and white board, windowed options available.</p>
      </div>
      <div class="variant-card">
        <div class="variant-card-num">04</div>
        <h4>Bakery Bags &amp; Greaseproof</h4>
        <p>Grease-resistant bakery bags, bread and baguette bags, and greaseproof sheets and wraps. Windowed bags for viscosity-free display of the product.</p>
      </div>
      <div class="variant-card">
        <div class="variant-card-num">05</div>
        <h4>Boards, Drums &amp; Inserts</h4>
        <p>Cake drums and boards in round and square, thin boards for slices, plus the inserts and pads that stop product moving in transit.</p>
      </div>
      <div class="variant-card accent">
        <div class="variant-card-num">—</div>
        <h4>Something specific?</h4>
        <p>Bakery sizing is fiddly. Send us the dimensions of your product — or a photo of the box you currently use — and we'll tell you honestly whether we can source it.</p>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Insert the custom-branding band**

MOQ framing here is load-bearing — do not soften it into a low-minimum claim.

```html
<!-- CUSTOM BAND -->
<div class="custom-band">
  <div class="custom-band-inner">
    <div>
      <span class="tag mono">Custom Branding</span>
      <h2>Custom Branded Bakery Packaging</h2>
      <p>Cake boxes, pastry boxes and bakery bags printed with your logo — for bakeries whose product travels home with the customer and sits on a table in front of other people. Custom print carries a higher minimum order than plain stock, since it's a production run rather than a shelf pick; we'll confirm the minimum against your spec before you commit.</p>
    </div>
    <div class="custom-band-actions">
      <a href="/custom-branded-packaging/" class="btn btn-primary">View Custom Packaging</a>
      <a href="/#contact" class="btn btn-ghost">Request a Quote</a>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Verify structure and MOQ compliance**

```bash
grep -c "<h1" bakery-packaging/index.html    # expect 1
grep -c "variant-card" bakery-packaging/index.html  # expect 6
grep -niE "low (moq|minimum)|small(er)? (run|order|quantit)|no minimum|as few as|starting at [0-9]|from [0-9,]+ units" bakery-packaging/index.html
```

The final grep must return **no output**. Any hit violates the MOQ constraint.

- [ ] **Step 6: Verify no new validation errors**

```bash
npx --yes html-validate bakery-packaging/index.html 2>&1 | tail -5
```

Expected: error count may rise (more `void-style`/`tel` instances are impossible here, so realistically unchanged at 19), but **no new rule names**. If a rule like `no-implicit-close` or `element-permitted-content` appears, a tag is unclosed — fix it.

- [ ] **Step 7: Commit**

```bash
git add bakery-packaging/index.html
git commit -m "feat: bakery page hero, intro, range grid and custom-branding band"
```

---

### Task 3: Keyword cluster prose, who-we-supply, CTA, cross-links

**Files:**
- Modify: `bakery-packaging/index.html` — append after the `<!-- CUSTOM BAND -->` block, before `<!-- FOOTER -->`

**Interfaces:**
- Consumes: Task 2's content; appends directly below it.
- Produces: the complete page body. Task 4 wires external links in.

This is the SEO-critical task. The `Cake Boxes Wholesale` section targets the cluster's only 100–1K term and is deliberately the longest.

- [ ] **Step 1: Insert the cluster section**

```html
<!-- CLUSTER SECTION — deep keyword prose -->
<div class="cluster-section">
  <div class="cluster-inner">
    <span class="tag mono">Bakery packaging — coverage</span>

    <h2>Cake Boxes Wholesale — UK Trade Supply</h2>
    <p>Cake boxes are the core of most bakery packaging orders, and the line where getting the spec right matters most. We supply cake boxes wholesale to UK bakeries across the standard footprints — 6", 8", 10" and 12" — in both standard and deep heights, plus tall boxes for layered and celebration cakes. Board choice runs from white-lined for a clean printed finish through to kraft for a plainer artisan look, with windowed lids where the product sells better on sight. Tell us the sizes you actually move and roughly how many a month, and we'll price the whole basket rather than a single line.</p>

    <h2>Cupcake &amp; Cake Slice Boxes</h2>
    <p>Cupcake boxes wholesale in single, four-hole, six-hole and twelve-hole formats, supplied with the inserts that keep cakes upright in transit — the insert matters more than the box for anything travelling by car. Individual cake slice boxes and dessert boxes suit counter and grab-and-go sales where a full cake box is overkill. Windowed options are available across the range.</p>

    <h2>Pastry &amp; Donut Boxes</h2>
    <p>Pastry boxes wholesale in flat formats for croissants, danishes and viennoiserie, and donut boxes in half-dozen and dozen configurations. The same board formats cover cookies, brownies and traybakes. If you sell a mixed pastry box, tell us the combination and we'll advise on which footprint holds it without the product sliding around.</p>

    <h2>Bakery Bags &amp; Greaseproof</h2>
    <p>Grease-resistant bakery bags, bread and baguette bags, and greaseproof sheets and wraps — the consumable end of a bakery order. We hold the depth of this range on our <a href="/paper-bags/">wholesale paper bags page</a>, including kraft, brown, printed and greaseproof lines, so start there if bags are the bulk of what you need.</p>

    <h2>Who Buys Bakery Packaging Through Us</h2>
    <p>The businesses on the ledger include: independent bakeries and craft bakeries, patisseries and cake shops, home and small-batch cake makers scaling into trade volumes, doughnut and cookie specialists, coffee shops with a counter bake offer, supermarket and farm-shop bakery counters, and dessert delivery kitchens. If you bake it and it leaves the premises in something, we can probably source that something.</p>
  </div>
</div>
```

Note the `Bakery Bags` section is deliberately short and defers to `/paper-bags/` — see spec § Overlap. Do not expand it.

- [ ] **Step 2: Insert who-we-supply**

```html
<!-- WHO WE SUPPLY -->
<div class="who-section">
  <div class="who-inner">
    <div class="who-grid">
      <div class="who-copy">
        <h2>Who We Supply</h2>
        <p>UK bakery businesses that buy packaging in volume and want honest trade pricing without navigating a consumer cake-supplies site. If you're ordering in the hundreds or thousands and want a single trade contact who knows your sizes, we're set up for you.</p>
      </div>
      <ul class="detail-list">
        <li>Independent and craft bakeries</li>
        <li>Patisseries and cake shops</li>
        <li>Home and small-batch cake makers scaling up</li>
        <li>Doughnut, cookie and dessert specialists</li>
        <li>Coffee shops with a counter bake offer</li>
        <li>Farm shop and supermarket bakery counters</li>
      </ul>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Insert the CTA band**

```html
<!-- CTA BAND -->
<div class="cta-band">
  <div class="cta-band-inner">
    <div>
      <span class="tag mono">Request a Quote</span>
      <h2>Send your bakery packaging sizes</h2>
      <p>Box sizes, rough monthly quantities, whether you need windows or print — we'll come back with trade pricing, usually the same day.</p>
    </div>
    <div class="cta-band-actions">
      <a href="/#contact" class="btn btn-accent">Request a Quote</a>
      <a href="https://wa.me/447440386717" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Insert the related-categories cross-links**

```html
<!-- RELATED SECTION -->
<div class="related-section">
  <div class="related-inner">
    <span class="tag mono">Related Categories</span>
    <h2>You May Also Need</h2>
    <div class="related-grid">
      <a href="/paper-bags/" class="related-card">
        <span class="related-card-num">CAT / 01</span>
        <h4>Wholesale Paper Bags</h4>
        <p>Kraft, brown, printed and greaseproof bags — the depth range for bakery bags.</p>
        <span class="arrow">View →</span>
      </a>
      <a href="/coffee-cups/" class="related-card">
        <span class="related-card-num">CAT / 02</span>
        <h4>Wholesale Coffee Cups</h4>
        <p>Recyclable, compostable and branded coffee cups at trade prices.</p>
        <span class="arrow">View →</span>
      </a>
      <a href="/custom-branded-packaging/" class="related-card">
        <span class="related-card-num">CAT / 03</span>
        <h4>Custom Branded Packaging</h4>
        <p>Your logo on cake boxes, bags and cups — printed to your artwork.</p>
        <span class="arrow">View →</span>
      </a>
      <a href="/catering-supplies/" class="related-card">
        <span class="related-card-num">CAT / 04</span>
        <h4>Catering Supplies</h4>
        <p>The wider trade range — packaging, disposables, napkins and cutlery.</p>
        <span class="arrow">View →</span>
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Verify the page is complete and compliant**

```bash
grep -c "<h2" bakery-packaging/index.html   # expect 11 (matches catering-supplies/index.html, same structure)
grep -niE "low (moq|minimum)|small(er)? (run|order|quantit)|no minimum|as few as|starting at [0-9]|from [0-9,]+ units" bakery-packaging/index.html
grep -nE "href=\"[^\"]*\.html\"" bakery-packaging/index.html
```

Both greps must return **no output**.

- [ ] **Step 6: Verify no new validation errors**

```bash
npx --yes html-validate bakery-packaging/index.html 2>&1 | grep -oE "[a-z-]+$" | sort -u
```

Expected: no rule names outside the baseline four.

- [ ] **Step 7: Visually confirm the page renders**

```bash
python3 -m http.server 8765 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/bakery-packaging/
```

Expected: `200`. Then open `http://localhost:8765/bakery-packaging/` and confirm: header and footer render styled (not unstyled text — that would mean the `<style>` block was damaged), the hero shows one H1, the range grid shows six cards, and the footer logo appears. Kill the server with `kill %1` when done.

- [ ] **Step 8: Commit**

```bash
git add bakery-packaging/index.html
git commit -m "feat: bakery page keyword cluster, who-we-supply, CTA and cross-links"
```

---

### Task 4: Sitemap and inbound internal links

**Files:**
- Modify: `sitemap.xml`
- Modify: `index.html` (homepage products grid)
- Modify: `catering-supplies/index.html`, `paper-bags/index.html`, `custom-branded-packaging/index.html` (related-categories grids)

**Interfaces:**
- Consumes: the live page at `/bakery-packaging/` from Task 3.
- Produces: nothing downstream — this is the final task.

- [ ] **Step 1: Add the sitemap entry**

In `sitemap.xml`, insert after the `/catering-supplies/` `<url>` block:

```xml
  <url>
    <loc>https://acsupplyco.co.uk/bakery-packaging/</loc>
    <lastmod>2026-07-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
```

- [ ] **Step 2: Verify the sitemap parses and excludes noindex pages**

```bash
xmllint --noout sitemap.xml && echo "XML OK"
grep -c "bakery-packaging" sitemap.xml        # expect 1
grep -cE "thank-you|404" sitemap.xml          # expect 0
```

Expected: `XML OK`, then `1`. The third must return 0 — house rule forbids `/thank-you/` and `404.html` in the sitemap.

- [ ] **Step 3: Add the homepage links**

⚠️ **Do not add a card to the homepage `.cat-grid`.** That grid is a fixed five-card layout (`.c1`–`.c5`, CSS defined at `index.html:645-649`) closed by a sixth CTA tile (`.cat cta`). A seventh card would need new CSS and would displace that tile. See "Known gap" below — homepage grid placement is deliberately out of scope for this plan.

Make two smaller homepage edits instead.

**3a.** In the `ItemList` JSON-LD (`index.html:105-115`), append a fifth entry:

```json
      { "@type": "ListItem", "position": 4, "name": "Custom Branded Packaging", "url": "https://acsupplyco.co.uk/custom-branded-packaging/" },
      { "@type": "ListItem", "position": 5, "name": "Bakery Packaging", "url": "https://acsupplyco.co.uk/bakery-packaging/" }
```

(The first line already exists — it is shown so you add the comma to it correctly.)

**3b.** In the footer "Catalogue" column (`index.html:1651-1657`), add a link after the `custom-branded-packaging` line:

```html
        <a href="/custom-branded-packaging/">Custom &amp; branded</a>
        <a href="/bakery-packaging/">Bakery packaging</a>
```

(Again, the first line exists already — shown for placement.)

Verify the homepage JSON-LD still parses:

```bash
python3 -c "
import json,re,pathlib
h=pathlib.Path('index.html').read_text()
for b in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', h, re.S):
    json.loads(b)
print('all homepage JSON-LD parses')
"
```

Expected: `all homepage JSON-LD parses`.

- [ ] **Step 4: Add cross-links from the three sibling pages**

In each of `catering-supplies/index.html`, `paper-bags/index.html`, and `custom-branded-packaging/index.html`, locate the `related-grid` block:

```bash
grep -n "related-grid" catering-supplies/index.html paper-bags/index.html custom-branded-packaging/index.html
```

All three pages currently have exactly four cards (verified: `grep -c related-card-num` returns 4 for each), so the new card is `CAT / 05` on all three. Add it as the last card inside each `related-grid`, matching the surrounding indentation:

```html
      <a href="/bakery-packaging/" class="related-card">
        <span class="related-card-num">CAT / 05</span>
        <h4>Bakery Packaging</h4>
        <p>Cake boxes, cupcake and pastry boxes, donut boxes and bakery bags.</p>
        <span class="arrow">View →</span>
      </a>
```

If any page turns out to have a different card count than 4, renumber to continue that page's sequence rather than duplicating `05`.

- [ ] **Step 5: Verify all inbound links exist and resolve**

```bash
grep -rln "bakery-packaging" --include="*.html" --include="*.xml" . | grep -v node_modules | sort
```

Expected exactly five files: `./catering-supplies/index.html`, `./custom-branded-packaging/index.html`, `./index.html`, `./paper-bags/index.html`, `./sitemap.xml` — plus `./bakery-packaging/index.html` itself if its own canonical matched.

Then confirm each link target resolves:

```bash
python3 -m http.server 8765 &
sleep 1
for p in / /bakery-packaging/ /paper-bags/ /catering-supplies/ /custom-branded-packaging/; do
  printf "%s -> " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8765$p"
done
kill %1
```

Expected: `200` for all five.

- [ ] **Step 6: Commit**

```bash
git add sitemap.xml index.html catering-supplies/index.html paper-bags/index.html custom-branded-packaging/index.html
git commit -m "feat: wire /bakery-packaging/ into sitemap and internal links"
```

---

## Known gap — pre-existing, out of scope

While mapping Task 4 I found that **`/catering-supplies/` and `/custom-pizza-boxes/` are orphaned from the homepage.** Neither appears in the homepage `.cat-grid`, the footer "Catalogue" column, nor the `ItemList` JSON-LD (which still lists only the original four products). Verify with:

```bash
grep -c "catering-supplies\|custom-pizza-boxes" index.html   # returns 0
```

This matters beyond tidiness: the homepage is the strongest internal-link source on the site, so those two pages get no link equity from it, which directly undercuts the SEO work that justified building them. `/bakery-packaging/` would inherit the same problem.

Task 4 Step 3 mitigates it for bakery only, via the footer and `ItemList` — the two places that take a new entry without a CSS change. Full grid placement for all three pages is a separate piece of work: it needs a `.c6` (and possibly `.c7`) rule at `index.html:645-649` and a decision about whether the `.cat cta` tile stays last, whether the grid grows past six tiles, and whether `CAT / 04` should still point at `/contact/` now that real category pages exist for some of that content.

**Recommendation:** do that as its own change once bakery ships, covering all three orphaned pages together rather than piecemeal.

## Post-implementation (manual, not automatable)

These need Amir and a live deploy — they are not part of the plan's tasks:

- Push to `main`; Cloudflare Pages deploys to acsupplyco.co.uk automatically. **Pushing publishes the page live.**
- Validate both JSON-LD blocks in Google's Rich Results Test against the live URL.
- Request indexing for `/bakery-packaging/` in Search Console and resubmit the sitemap.
- At the next monthly SEO session, check whether `bakery packaging wholesale` (the H1 term, volume unrecorded — see spec) is actually pulling impressions. If it is flat and `cake boxes wholesale` is not, reweight the H1 toward cake boxes.
