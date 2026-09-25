/* /quote/ — renders the basket, lets the buyer adjust quantities within each
   product's price breaks, and submits everything as one quote request.
   Submission goes to Web3Forms (email + tracking, same as every other form on
   the site) and, when QUOTE_SHEET_URL is set, to the Google Apps Script that
   appends a row to the quotes sheet and emails a summary. */
(() => {
  'use strict';
  // Paste the Apps Script web-app URL here once deployed (see scripts/quote-sheet.gs). Empty = skip the sheet.
  const QUOTE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzlZ-IOqdqGPw0rv8jKfiR04Hxprg5tkNdV7td41dFdaL1tkeGbuQEznBfUaGtOZQy1zQ/exec';

  const Q = window.acQuote;
  const $ = id => document.getElementById(id);
  const grouped = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const money = (value, places) => { const s = value.toString().padStart(places + 1, '0'); return `£${grouped(s.slice(0, -places))}.${s.slice(-places)}`; };
  const divRound = (n, d) => (2n * n + d) / (2n * d);
  const toPence = (qty, milli) => divRound(BigInt(qty) * BigInt(milli), 10n);

  function reprice(line, qty) {
    const tier = line.tiers.find(t => t.qty === qty);
    if (!tier) return { ...line, qty, custom_qty: true, unit: null, unit_milli: null, subtotal: null, subtotal_pence: null };
    if (tier.unit === null) return { ...line, qty, custom_qty: false, unit: null, unit_milli: null, subtotal: null, subtotal_pence: null };
    const sub = toPence(qty, tier.unit);
    return { ...line, qty, custom_qty: false, unit: money(BigInt(tier.unit), 3), unit_milli: tier.unit, subtotal: money(sub, 2), subtotal_pence: sub.toString() };
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'class') node.className = v; else if (k.startsWith('on')) node.addEventListener(k.slice(2), v); else node.setAttribute(k, v); });
    children.forEach(c => node.append(c));
    return node;
  }

  function render() {
    const lines = Q.lines();
    const box = $('lines');
    box.replaceChildren();
    $('empty').hidden = lines.length > 0;
    $('cart-form').hidden = lines.length === 0;
    $('totals').hidden = lines.length === 0;
    lines.forEach(line => {
      const unit = line.unit_word || { one: 'unit', many: 'units' };
      const qtyLabel = line.qty ? `${grouped(String(line.qty))} ${unit.many}` : 'Custom quantity';
      const priceBlock = el('div', { class: 'money' },
        el('strong', {}, line.subtotal || 'To be quoted'),
        el('small', {}, line.unit ? `${line.unit} / ${unit.one} · ${qtyLabel}` : qtyLabel));
      const actions = el('div', { class: 'line-actions' });
      if (line.tiers.length) {
        const select = el('select', { 'aria-label': 'Quantity', onchange: e => { const v = e.target.value; const next = reprice(line, v === 'custom' ? null : Number(v)); Q.update(line.id, next); trackQty(line, next); render(); } });
        line.tiers.forEach(t => select.append(el('option', { value: t.qty, ...(t.qty === line.qty ? { selected: '' } : {}) }, `${grouped(String(t.qty))} ${unit.many}`)));
        select.append(el('option', { value: 'custom', ...(line.custom_qty ? { selected: '' } : {}) }, 'Custom quantity…'));
        actions.append(el('label', {}, 'Quantity ', select));
      }
      if (line.custom_qty) {
        actions.append(el('input', { type: 'text', inputmode: 'numeric', placeholder: `How many ${unit.many}?`, value: line.qty || '', 'aria-label': 'Custom quantity', onchange: e => { const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10); Q.update(line.id, { qty: n || null }); trackQty(line, { ...line, qty: n || null }); render(); } }));
      }
      actions.append(el('button', { type: 'button', onclick: () => {
        window.acTrack('remove_from_cart', { ecommerce: { currency: 'GBP', value: window.acLineValue(line), items: [window.acItem(line)] } });
        Q.remove(line.id); render();
      } }, 'Remove'));
      box.append(el('div', { class: 'line' },
        el('div', {},
          el('h2', {}, el('a', { href: line.url }, line.product)),
          el('p', { class: 'opts' }, line.options.map(o => `${o.label}: ${o.value}`).join(' · ')),
          el('p', { class: 'lead' }, line.lead_time || '')),
        priceBlock, actions));
    });
    const total = Q.totalPence();
    const unpriced = lines.filter(l => l.subtotal_pence === null || l.subtotal_pence === undefined).length;
    $('grand').textContent = total === null ? 'To be quoted' : Q.money(total);
    $('grand-note').textContent = unpriced && total !== null ? `plus ${unpriced} item${unpriced === 1 ? '' : 's'} to be quoted` : '';
  }

  function trackQty(before, after) {
    window.acTrack('update_cart_qty', {
      product_id: before.product_id, variant_sku: before.sku || undefined,
      previous_qty: before.qty || 'custom', new_qty: after.custom_qty && !after.qty ? 'custom' : after.qty,
      value: window.acLineValue(after), currency: 'GBP'
    });
  }
  const cartEvent = lines => {
    const total = Q.totalPence();
    return { currency: 'GBP', value: total === null ? 0 : Number(total) / 100, items: lines.map((l, i) => window.acItem(l, i)) };
  };

  function summary(lines) {
    return lines.map((l, i) => {
      const opts = l.options.map(o => `${o.label}: ${o.value}`).join(', ');
      const qty = l.qty ? `${grouped(String(l.qty))}` : 'custom';
      return `${i + 1}. ${l.product} [${l.sku || 'no SKU'}] — ${opts} — qty ${qty} — ${l.unit ? `${l.unit} each, ${l.subtotal}` : 'to be quoted'} — ${l.lead_time || ''}`;
    }).join('\n');
  }

  $('cart-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target, submit = $('cart-submit'), label = submit.innerHTML, lines = Q.lines();
    if (!lines.length) return;
    const total = Q.totalPence();
    form.elements.quote_lines.value = summary(lines);
    form.elements.quote_total.value = total === null ? 'To be quoted' : Q.money(total) + ' ex VAT';
    form.elements.quote_json.value = JSON.stringify(lines.map(({ tiers, unit_word, ...l }) => l));
    submit.disabled = true;
    submit.textContent = 'Sending...';
    try {
      const obj = Object.fromEntries(new FormData(form));
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(obj)
      });
      const result = await response.json();
      if (!result.success) throw new Error('rejected');
      if (QUOTE_SHEET_URL) {
        // Fire-and-forget: the sheet is a copy, the email above is the record. Apps Script needs text/plain + no-cors.
        fetch(QUOTE_SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ ...obj, lines, submitted: new Date().toISOString() }) }).catch(() => {});
      }
      const ecommerce = cartEvent(lines);
      window.acTrack('generate_lead', {
        form_id: 'cart', lead_type: 'quote_request',
        value: ecommerce.value, currency: 'GBP', item_count: lines.length,
        user_email: (obj.email || '').trim().toLowerCase(), user_phone: (obj.phone || '').replace(/[^\d+]/g, ''),
        ecommerce
      });
      Q.clear();
      setTimeout(function () { window.location.href = '/thank-you/'; }, 400);
    } catch (err) {
      window.acTrack('form_error', { form_id: 'cart', error_type: err.message === 'rejected' ? 'rejected' : 'network' });
      const error = $('cart-error');
      error.hidden = false;
      error.textContent = 'Something went wrong — please email sales@acsupplyco.co.uk directly.';
      submit.disabled = false;
      submit.innerHTML = label;
    }
  });

  // First touch on any field in the send form = the buyer has started checking out.
  $('cart-form').addEventListener('focusin', () => {
    window.acTrack('begin_checkout', { form_id: 'cart', ecommerce: cartEvent(Q.lines()) });
  }, { once: true });

  render();
  document.addEventListener('DOMContentLoaded', () => {
    const lines = Q.lines();
    if (lines.length) window.acTrack('view_cart', { ecommerce: cartEvent(lines) });
  });
})();
