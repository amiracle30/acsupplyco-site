/* Shared product-page behaviour: gallery, option availability, quantity → price,
   enquiry summary + quote form. The page is already complete HTML before this
   runs; everything here is driven by the #product-data JSON the build embeds. */
(() => {
  'use strict';
  const dataEl = document.getElementById('product-data');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const $ = id => document.getElementById(id);

  /* ---------- money: exact decimal maths on BigInt, never floats ----------
     Mirrors unit_price()/subtotal() in scripts/productlib.py.
     unit     = tier × Π(option multipliers), half-up to £0.001  → held in thousandths of a pound
     subtotal = qty × unit, half-up to £0.01                     → held in pence */
  const dec = s => { const [i, f = ''] = String(s).split('.'); return { n: BigInt(i + f), d: 10n ** BigInt(f.length) }; };
  const divRound = (n, d) => (2n * n + d) / (2n * d);
  function unitMilli(tierUnit, mults) {
    if (tierUnit === null || tierUnit === undefined) return null;
    let { n, d } = dec(tierUnit);
    mults.forEach(m => { const x = dec(m); n *= x.n; d *= x.d; });
    return divRound(n * 1000n, d);
  }
  const toPence = (qty, milli) => divRound(BigInt(qty) * milli, 10n);
  const grouped = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const money = (value, places) => { const s = value.toString().padStart(places + 1, '0'); return `£${grouped(s.slice(0, -places))}.${s.slice(-places)}`; };
  const count = n => grouped(String(n));
  const chargesPence = data.charges.reduce((sum, c) => sum + dec(c.amount).n, 0n);

  /* ---------- state ---------- */
  const selected = { ...data.defaults };
  new URLSearchParams(location.search).forEach((value, key) => {
    const option = data.options.find(o => o.key === key);
    if (option && option.values.some(v => v.value === value)) selected[key] = value;
  });
  let quantity = null;
  let quantityNote = '';
  let gallery = [];
  let galleryKey = '';

  const matches = (partial, selection) => Object.entries(partial || {}).every(([k, v]) => selection[k] === v);
  const variantFor = selection => data.variants.find(v => data.options.every(o => v.selection[o.key] === selection[o.key]));
  const valueOf = option => option.values.find(v => v.value === selected[option.key]);
  const isPriced = variant => Boolean(variant && variant.available && variant.mode === 'priced' && data.pricing[variant.pricing_ref]);
  function tiersFor(variant) {
    if (!isPriced(variant)) return [];
    // "flat" pricing entries are already final prices — option multipliers are not applied on top.
    const mults = data.flat.includes(variant.pricing_ref) ? [] : data.options.map(valueOf).filter(v => v && v.mult).map(v => v.mult);
    return data.pricing[variant.pricing_ref].map(([qty, unit]) => ({ qty, unit: unitMilli(unit, mults) }));
  }

  /* ---------- gallery ---------- */
  const hero = $('hero-image');
  const heroSource = $('hero-source');
  const thumbnails = $('thumbnails');
  function showImage(index) {
    const image = gallery[index];
    if (!image) return;
    heroSource.srcset = image.src;
    hero.src = image.jpg;
    hero.alt = image.alt;
    hero.width = image.w;
    hero.height = image.h;
    $('image-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(gallery.length).padStart(2, '0')}`;
    [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }
  function renderGallery() {
    // Hero-role images beat gallery-role; then the most specific match wins; then `order`.
    const specificity = image => Object.keys(image.match).length;
    const matched = data.images.filter(i => i.role !== 'inspiration' && matches(i.match, selected))
      .sort((a, b) => (a.role === 'hero' ? 0 : 1) - (b.role === 'hero' ? 0 : 1) || specificity(b) - specificity(a) || a.order - b.order);
    const inspiration = data.images.filter(i => i.role === 'inspiration' && matches(i.match, selected)).sort((a, b) => a.order - b.order);
    const seen = new Set();
    const next = [...matched, ...inspiration].filter(i => !seen.has(i.src) && seen.add(i.src));
    const key = next.map(i => i.src).join('|');
    if (key === galleryKey) return;
    galleryKey = key;
    gallery = next;
    thumbnails.replaceChildren(...gallery.map((image, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumbnail';
      button.dataset.image = index;
      button.setAttribute('aria-label', `Show image ${index + 1} of ${gallery.length}`);
      const img = document.createElement('img');
      Object.assign(img, { src: image.thumb, alt: '', width: image.tw, height: image.th, loading: 'lazy' });
      button.append(img);
      return button;
    }));
    thumbnails.hidden = $('image-counter').hidden = gallery.length < 2;
    showImage(0);
  }
  thumbnails.addEventListener('click', event => {
    const button = event.target.closest('[data-image]');
    if (button) showImage(Number(button.dataset.image));
  });

  /* ---------- render ---------- */
  function tierMarkup(tier, first, unitWord) {
    const head = `<strong>${count(tier.qty)} ${unitWord}</strong>`;
    if (tier.unit === null) return `${head}<span class="price">POA</span><small>Price on request</small><span class="save"></span>`;
    const saving = first && first > tier.unit ? divRound(100n * (first - tier.unit), first) : 0n;
    return `${head}<span class="price">${money(tier.unit, 3)}</span><small>${money(toPence(tier.qty, tier.unit), 2)} total</small><span class="save">${saving > 0n ? `Save ${saving}%` : 'Starting quantity'}</span>`;
  }
  function selectionNote(variant) {
    if (!variant) return 'This combination isn’t available. Change one option, or request a quote and we’ll advise.';
    const notes = data.options.map(valueOf).filter(v => v && v.note).map(v => v.note);
    if (!isPriced(variant)) return [...notes, 'Tell us the quantity you need and we’ll price this configuration for you.'].join(' ');
    return [...notes, quantityNote].filter(Boolean).join(' ');
  }
  function render() {
    renderGallery();
    const variant = variantFor(selected);
    const tiers = tiersFor(variant);
    if (tiers.length && !tiers.some(t => t.qty === quantity)) {
      const previous = quantity;
      quantity = (tiers.find(t => t.qty >= (previous || 0)) || tiers[tiers.length - 1]).qty;
      quantityNote = previous ? `${count(previous)} isn’t a price break for this option, so the quantity is now ${count(quantity)}.` : '';
    }
    document.querySelectorAll('[data-option]').forEach(button => {
      const { option, value } = button.dataset;
      button.setAttribute('aria-pressed', String(selected[option] === value));
      // Disabled when no variant exists for this value with the other choices left exactly as they are.
      button.disabled = selected[option] !== value && !variantFor({ ...selected, [option]: value });
      button.title = button.disabled ? 'Not available with your other choices' : '';
    });
    document.querySelectorAll('[data-selection]').forEach(el => {
      const option = data.options.find(o => o.key === el.dataset.selection);
      el.textContent = valueOf(option)?.label ?? '';
    });
    document.querySelectorAll('#specs [data-applies]').forEach(el => { el.hidden = !matches(JSON.parse(el.dataset.applies), selected); });

    const note = $('selection-note');
    note.textContent = selectionNote(variant);
    note.hidden = !note.textContent;

    const priced = tiers.filter(t => t.unit !== null);
    const first = priced.length ? priced[0].unit : null;
    $('tiers').innerHTML = tiers.map(t => `<button type="button" class="tier" data-quantity="${t.qty}" aria-pressed="${t.qty === quantity}">${tierMarkup(t, first, data.unit.many)}</button>`).join('')
      || '<p>Pricing for this configuration is on request.</p>';
    $('from-price').textContent = priced.length ? money(priced.reduce((min, t) => (t.unit < min ? t.unit : min), priced[0].unit), 3) : 'Price on request';

    const tier = tiers.find(t => t.qty === quantity);
    const rows = [];
    let total = 'Price on request';
    if (tier && tier.unit !== null) {
      const sub = toPence(tier.qty, tier.unit);
      rows.push([`Unit price · ${count(tier.qty)} ${data.unit.many}`, `${money(tier.unit, 3)} / ${data.unit.one}`], ['Subtotal', money(sub, 2)]);
      data.charges.forEach(c => rows.push([c.label, money(dec(c.amount).n, 2)]));
      total = money(sub + chargesPence, 2);
    }
    $('order-rows').replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'sum-row';
      row.innerHTML = '<span></span><span></span>';
      row.children[0].textContent = label;
      row.children[1].textContent = value;
      return row;
    }));
    $('total').textContent = total;
    $('mobile-total').textContent = total;
    $('lead-time').textContent = variant && variant.available ? (variant.lead_time || data.lead_time) : 'Availability and lead time confirmed with your quote';
  }

  $('options').addEventListener('click', event => {
    const button = event.target.closest('[data-option]');
    if (!button || button.disabled) return;
    selected[button.dataset.option] = button.dataset.value;
    quantityNote = '';
    render();
  });
  $('tiers').addEventListener('click', event => {
    const button = event.target.closest('[data-quantity]');
    if (!button) return;
    quantity = Number(button.dataset.quantity);
    quantityNote = '';
    render();
    document.querySelector(`[data-quantity="${quantity}"]`)?.focus();
  });

  /* ---------- enquiry ---------- */
  const dialog = $('quote-dialog');
  const form = $('product-quote-form');
  const qtyField = $('quote-qty');
  function openQuote(customQuantity) {
    const variant = variantFor(selected);
    const tier = customQuantity ? null : tiersFor(variant).find(t => t.qty === quantity);
    const hasPrice = Boolean(tier && tier.unit !== null);
    const options = data.options.map(o => `${o.label}: ${valueOf(o)?.label ?? selected[o.key]}`);
    const unit = hasPrice ? `${money(tier.unit, 3)} / ${data.unit.one}` : 'To be quoted';
    const sub = hasPrice ? money(toPence(tier.qty, tier.unit), 2) : 'To be quoted';
    const total = hasPrice ? money(toPence(tier.qty, tier.unit) + chargesPence, 2) : 'To be quoted';
    form.elements.variant_sku.value = variant ? variant.sku : 'No matching variant';
    form.elements.selected_options.value = options.join(' · ');
    form.elements.unit_estimate.value = unit;
    form.elements.subtotal_estimate.value = sub;
    form.elements.total_estimate.value = total;
    form.elements.page_path.value = location.pathname;
    qtyField.value = tier ? count(tier.qty) : '';
    qtyField.readOnly = Boolean(tier);
    qtyField.placeholder = tier ? '' : `How many ${data.unit.many} do you need?`;
    $('quote-summary').textContent = [
      data.title, ...options,
      tier ? `Quantity: ${count(tier.qty)} ${data.unit.many}` : 'Quantity: custom — tell us below',
      hasPrice ? `Indicative unit price: ${unit}` : 'Price: to be quoted',
      hasPrice ? `Indicative total: ${total} ex VAT · VAT added at 20%` : '',
      'Delivery: Free — single UK mainland consignment',
    ].filter(Boolean).join('\n');
    $('quote-error').hidden = true;
    dialog.showModal();
    (tier ? form.elements.name : qtyField).focus();
  }
  document.querySelectorAll('[data-quote]').forEach(button => button.addEventListener('click', () => openQuote(false)));
  $('custom-quantity').addEventListener('click', () => openQuote(true));
  $('close-quote').addEventListener('click', () => dialog.close());

  // Same Web3Forms endpoint, generate_lead event and 400ms redirect delay as the site's other quote forms.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = $('quote-submit');
    const label = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = 'Sending...';
    try {
      const obj = Object.fromEntries(new FormData(form));
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(obj)
      });
      const result = await response.json();
      if (!result.success) throw new Error('failed');
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'generate_lead',
        form_id: 'product',
        lead_type: 'quote_request',
        product_id: data.id,
        user_email: (obj.email || '').trim().toLowerCase(),
        user_phone: (obj.phone || '').replace(/[^\d+]/g, '')
      });
      setTimeout(function () { window.location.href = '/thank-you/'; }, 400);
    } catch (err) {
      const error = $('quote-error');
      error.hidden = false;
      error.textContent = 'Something went wrong — please email sales@acsupplyco.co.uk directly.';
    } finally {
      submit.disabled = false;
      submit.innerHTML = label;
    }
  });

  render();
})();
