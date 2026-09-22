/* Quote basket shared by every product page and /quote/.
   Lines live in localStorage under "ac_quote" — no server, no accounts.
   A line is what product-page.js already assembles for a single enquiry:
   { id, product_id, product, sku, options:[{key,label,value}], qty, custom_qty,
     unit (string £ or null), subtotal (string £ or null), lead_time, url, added } */
(() => {
  'use strict';
  const KEY = 'ac_quote';

  function read() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function write(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* private mode: basket lives for this page only */ }
    document.dispatchEvent(new CustomEvent('ac-quote-change', { detail: { count: lines.length } }));
    badge();
  }
  function badge() {
    const n = read().length;
    document.querySelectorAll('[data-quote-count]').forEach(el => { el.textContent = n ? `(${n})` : ''; });
    document.querySelectorAll('[data-quote-link]').forEach(el => { el.hidden = false; });
  }

  window.acQuote = {
    lines: read,
    add(line) {
      const lines = read();
      const same = lines.find(l => l.sku === line.sku && l.qty === line.qty && !l.custom_qty && !line.custom_qty);
      if (same) { same.added = Date.now(); } else { lines.push({ ...line, id: `${line.sku}-${Date.now().toString(36)}`, added: Date.now() }); }
      write(lines);
      return lines.length;
    },
    update(id, patch) { write(read().map(l => (l.id === id ? { ...l, ...patch } : l))); },
    remove(id) { write(read().filter(l => l.id !== id)); },
    clear() { write([]); },
    count() { return read().length; },
    // Pence total across priced lines, as a BigInt; null if nothing is priced.
    totalPence() {
      let total = 0n, any = false;
      read().forEach(l => { if (l.subtotal_pence !== undefined && l.subtotal_pence !== null) { total += BigInt(l.subtotal_pence); any = true; } });
      return any ? total : null;
    },
    money(pence) { const s = pence.toString().padStart(3, '0'); return `£${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${s.slice(-2)}`; },
  };
  document.addEventListener('DOMContentLoaded', badge);
  window.addEventListener('storage', e => { if (e.key === KEY) badge(); });
})();
