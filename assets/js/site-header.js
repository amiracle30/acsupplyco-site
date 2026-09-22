/* Site header behaviour — generated from header.html by scripts/apply-header.py. Edit header.html, not this file. */
(() => {
  const header = document.querySelector('.hdr-root');
  if (!header || header.dataset.hdrReady) return;
  header.dataset.hdrReady = 'true';
  const panel = header.querySelector('.hdr-panel');
  const toggle = header.querySelector('.hdr-toggle');
  const mobile = header.querySelector('.hdr-mobile-nav');
  const desktop = window.matchMedia('(min-width:801px)');
  const setCurrent = () => {
    header.querySelectorAll('[data-hdr-section]').forEach(link => {
      if (link.dataset.hdrSection === header.dataset.current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };
  header.querySelector('.hdr-quote').dataset.hdrSection = 'quote';
  header.querySelector('#hdr-guides-menu a').dataset.hdrSection = 'guides';
  // Keep the six category links navigable; their mobile summaries toggle separate accordions.
  header.querySelectorAll('[data-hdr-mobile]').forEach(source => {
    const details = document.createElement('details');
    details.className = 'hdr-accordion';
    const summary = document.createElement('summary');
    const icon = source.querySelector('.hdr-icon');
    if (icon) summary.append(icon.cloneNode(true));
    summary.append(document.createTextNode(source.dataset.hdrMobile));
    const list = document.createElement('ul');
    list.className = 'hdr-mobile-list';
    const category = source.querySelector('.hdr-category-link');
    if (category) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = category.getAttribute('href');
      link.dataset.hdrSection = category.dataset.hdrSection;
      link.textContent = 'View all ' + source.dataset.hdrMobile.toLowerCase();
      item.append(link);
      list.append(item);
    }
    source.querySelectorAll('.hdr-menu > li').forEach(item => list.append(item.cloneNode(true)));
    details.append(summary, list);
    // Categories first, then Industries and Guides.
    if (category) mobile.insertBefore(details, mobile.querySelector('[data-hdr-secondary]'));
    else { details.dataset.hdrSecondary = 'true'; mobile.append(details); }
  });
  header.querySelectorAll('.hdr-main > a').forEach(link => {
    const copy = link.cloneNode(true);
    copy.className = 'hdr-mobile-link';
    mobile.append(copy);
  });
  setCurrent();
  new MutationObserver(setCurrent).observe(header, { attributes:true, attributeFilter:['data-current'] });
  header.querySelectorAll('.hdr-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector(':scope > button, :scope > a');
    const open = () => {
      dropdown.classList.remove('hdr-dismissed');
      dropdown.classList.add('hdr-open');
      trigger.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      dropdown.classList.remove('hdr-open');
      dropdown.classList.add('hdr-dismissed');
      trigger.setAttribute('aria-expanded', 'false');
    };
    dropdown.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') open(); });
    dropdown.addEventListener('pointerleave', () => { if (!dropdown.contains(document.activeElement)) close(); });
    dropdown.addEventListener('focusin', open);
    dropdown.addEventListener('focusout', event => { if (!dropdown.contains(event.relatedTarget)) close(); });
    trigger.addEventListener('click', () => { if (trigger.tagName === 'BUTTON') open(); });
    dropdown.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        trigger.focus();
        close();
      } else if (event.key === 'ArrowDown' && event.target === trigger) {
        event.preventDefault();
        open();
        dropdown.querySelector('.hdr-menu a').focus();
      }
    });
  });
  let previousOverflow = '';
  toggle.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    panel.showModal();
    document.body.style.overflow = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');
  });
  header.querySelector('.hdr-close').addEventListener('click', () => panel.close());
  panel.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    toggle.setAttribute('aria-expanded', 'false');
    if (!desktop.matches) toggle.focus();
  });
  panel.addEventListener('click', event => { if (event.target.closest('a')) panel.close(); });
  desktop.addEventListener('change', () => { if (desktop.matches && panel.open) panel.close(); });
})();
