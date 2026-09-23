/* Homepage product tiles read the public catalogue on every load. Exact-decimal pricing
   matches product-page.js: multiply first, then round half-up to £0.001. */
(() => {
  'use strict';
  const decimal = value => {
    const [integer, fraction = ''] = String(value).split('.');
    return { n: BigInt(integer + fraction), d: 10n ** BigInt(fraction.length) };
  };
  function unitMilli(unit, multipliers) {
    let { n, d } = decimal(unit);
    for (const multiplier of multipliers) {
      const x = decimal(multiplier);
      n *= x.n;
      d *= x.d;
    }
    return (2n * n * 1000n + d) / (2n * d);
  }
  const money = milli => {
    const value = milli.toString().padStart(4, '0');
    return `£${value.slice(0, -3)}.${value.slice(-3)}`;
  };
  async function populate(card) {
    try {
      const response = await fetch(`/data/products/${card.dataset.product}.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Product record unavailable');
      const product = await response.json();
      if (product.status !== 'published') return;
      let best = null;
      for (const variant of product.variants) {
        if (!variant.available || (variant.enquiry || product.enquiry).mode !== 'priced') continue;
        const pricing = product.pricing.find(entry => entry.ref === variant.pricing_ref);
        if (!pricing) continue;
        const options = product.options.map(option => ({
          key: option.key,
          value: option.values.find(value => value.value === variant.selection[option.key])
        }));
        if (options.some(option => !option.value)) continue;
        const multipliers = pricing.apply_multipliers === false ? [] : options.map(option => option.value.mult).filter(Boolean);
        for (const tier of pricing.tiers) {
          if (tier.unit === null || tier.unit === undefined) continue;
          const unit = unitMilli(tier.unit, multipliers);
          if (best === null || unit < best.unit || (unit === best.unit && tier.qty > best.qty)) {
            best = { unit, qty: tier.qty, options, selection: variant.selection };
          }
        }
      }
      if (!best) return;
      const price = card.querySelector('[data-price]');
      price.replaceChildren(document.createTextNode(`From ${money(best.unit)} / unit `));
      const vat = document.createElement('small');
      vat.textContent = 'ex VAT';
      price.append(vat);
      card.querySelector('[data-price-basis]').textContent = `${best.qty.toLocaleString('en-GB')} units · ${best.options.map(option => option.value.label).join(' · ')}. Indicative pricing; your written quote confirms.`;
      card.querySelector('.price-detail').hidden = false;
      const query = new URLSearchParams(best.selection);
      const href = `/${product.category}/${product.slug}/?${query.toString()}`;
      card.querySelectorAll('a').forEach(link => { link.href = href; });
    } catch (error) {
      // Keep the descriptive product links and honest fallback when offline.
      console.warn('Homepage pricing unavailable:', card.dataset.product, error.message);
    }
  }
  document.querySelectorAll('[data-product]').forEach(populate);
})();
