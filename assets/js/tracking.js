// AC Supply Co. — client-side tracking helpers
// Consent banner (Advanced Consent Mode v2, deny-by-default) + contact-click tracking.
// Loaded on every page via <script src="/assets/js/tracking.js" defer></script>.

// ---- Consent banner ----
(function () {
  function gtag(){ window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  var KEY = 'ac_consent';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}

  function apply(state) {
    gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state
    });
    window.dataLayer.push({
      event: 'cookie_consent_update',
      consent_action: state === 'granted' ? 'accept' : 'reject'
    });
  }

  function decide(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) {}
    apply(choice);
    var b = document.getElementById('ac-consent');
    if (b) b.remove();
  }

  function showBanner() {
    function render() {
      if (document.getElementById('ac-consent')) return;
      var el = document.createElement('div');
      el.id = 'ac-consent';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-label', 'Cookie consent');
      el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;'
        + 'max-width:560px;margin:0 auto;background:#0F1F3D;color:#fff;padding:18px 20px;'
        + 'border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.35);'
        + 'font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
      el.innerHTML =
        '<p style="margin:0 0 12px">We use cookies to measure traffic and improve our ads. '
        + '<a href="/privacy/" style="color:#8FD3AC;text-decoration:underline">Learn more</a>.</p>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
        + '<button type="button" id="ac-accept" style="flex:1;min-width:120px;background:#1F6B43;color:#fff;'
        + 'border:0;padding:10px 14px;border-radius:4px;cursor:pointer;font-weight:600;font:inherit">Accept</button>'
        + '<button type="button" id="ac-reject" style="flex:1;min-width:120px;background:transparent;color:#fff;'
        + 'border:1px solid rgba(255,255,255,.4);padding:10px 14px;border-radius:4px;cursor:pointer;font:inherit">Reject</button>'
        + '</div>';
      document.body.appendChild(el);
      document.getElementById('ac-accept').addEventListener('click', function(){ decide('granted'); });
      document.getElementById('ac-reject').addEventListener('click', function(){ decide('denied'); });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }

  if (saved === 'granted' || saved === 'denied') {
    apply(saved);
  } else {
    showBanner();
  }
})();

// ---- Funnel / ecommerce helpers ----
// Product and quote scripts load before this file, so they call acTrack from
// DOMContentLoaded or user actions — never at parse time.
// Event names follow GA4's ecommerce set; prices here are analytics-only floats,
// the pages themselves still price with exact decimals.
window.acTrack = function (event, params) {
  window.dataLayer = window.dataLayer || [];
  if (params && params.ecommerce) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(Object.assign({ event: event }, params));
};
// A quote-basket line (see quote-basket.js) → a GA4 item.
window.acItem = function (line, index) {
  var item = {
    item_id: line.product_id,
    item_name: line.product,
    item_category: line.category,
    item_variant: line.sku || undefined,
    quantity: line.qty || 1,
    price: line.unit_milli ? Number(line.unit_milli) / 1000 : 0
  };
  if (index !== undefined) item.index = index;
  return item;
};
window.acLineValue = function (line) {
  return line.subtotal_pence ? Number(line.subtotal_pence) / 100 : 0;
};

// ---- Product-tile clicks (homepage + category pages) → select_item ----
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-product] a[href], a.variant-card[href]');
    if (!a) return;
    var tile = a.closest('[data-product]') || a;
    var path = new URL(a.href, location.href).pathname.split('/').filter(Boolean);
    var list = location.pathname === '/' ? 'home' : location.pathname.split('/').filter(Boolean)[0];
    var tiles = Array.prototype.slice.call(document.querySelectorAll('[data-product], a.variant-card'));
    var heading = tile.querySelector('h3');
    window.acTrack('select_item', { ecommerce: {
      item_list_id: list,
      item_list_name: list,
      items: [{
        item_id: tile.getAttribute('data-item-id') || tile.getAttribute('data-product') || path[1],
        item_name: heading ? heading.textContent.trim() : undefined,
        item_category: path[0],
        index: tiles.indexOf(tile)
      }]
    } });
  }, true);
})();

// ---- Contact-click tracking (WhatsApp / phone / email) ----
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var evt = null;
    if (href.indexOf('wa.me/') > -1 || href.toLowerCase().indexOf('whatsapp') > -1) evt = 'contact_whatsapp';
    else if (href.indexOf('tel:') === 0) evt = 'contact_phone';
    else if (href.indexOf('mailto:') === 0) evt = 'contact_email';
    else if (a.hasAttribute('data-gform') || href.indexOf('docs.google.com/forms') > -1) evt = 'google_form_click';
    if (!evt) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: evt, link_url: href, page_path: location.pathname });
  }, true);
})();
