/* Enhance static app pages with local image galleries and accessible information tabs. */
(() => {
  'use strict';
  const root = document.querySelector('.app-case');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const panels = [...root.querySelectorAll('.detail-panel')];
  function activateTab(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    if (focus) tab.focus();
  }
  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${panel.id}`);
    panel.tabIndex = 0;
  });
  const tabList = root.querySelector('.detail-tabs');
  tabList.hidden = false;
  root.classList.add('details-ready');
  activateTab(tabs[0]);
  tabs.forEach((tab,index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
    });
  });
  function followPanelHash() {
    const tab = tabs.find(item => `#${item.getAttribute('aria-controls')}` === location.hash);
    if (tab) activateTab(tab);
  }
  followPanelHash();
  addEventListener('hashchange', followPanelHash);

  const gallery = root.querySelector('.product-gallery');
  const slides = [...gallery.querySelectorAll('.gallery-slide')];
  if (!slides.length) return;
  const viewport = gallery.querySelector('.gallery-viewport');
  const filters = [...gallery.querySelectorAll('[data-gallery-filter]')];
  const dots = [...gallery.querySelectorAll('[data-gallery-index]')];
  const count = gallery.querySelector('.gallery-count');
  const caption = gallery.querySelector('#gallery-caption');
  const description = gallery.querySelector('.gallery-description');
  const ambient = gallery.querySelector('.gallery-ambient');
  const status = gallery.querySelector('.gallery-status');
  const dialog = root.querySelector('.gallery-lightbox');
  const viewerImage = dialog.querySelector('.lightbox-stage img');
  const viewerCaption = dialog.querySelector('.lightbox-caption');
  const viewerStage = dialog.querySelector('.lightbox-stage');
  const zoom = dialog.querySelector('[data-viewer-zoom]');
  const viewerStatus = document.createElement('p');
  viewerStatus.className = 'sr-only';
  viewerStatus.setAttribute('role', 'status');
  dialog.append(viewerStatus);
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = 0;
  let category = 'all';
  let pending = 0;
  let animation;
  let savedOverflow;
  const pool = group => slides.map((slide,index) => ({slide,index})).filter(({slide}) => group === 'all' || slide.dataset.group === group).map(({index}) => index);
  const motionEnabled = () => !reduced.matches && document.documentElement.dataset.motion !== 'off';
  function stopAnimation() { animation?.cancel(); animation = null; }
  function updateMotion() { if (!motionEnabled()) stopAnimation(); }
  reduced.addEventListener('change', updateMotion);
  new MutationObserver(updateMotion).observe(document.documentElement, {attributes:true, attributeFilter:['data-motion']});

  function updateViewer() {
    if (!dialog.open) return;
    const image = slides[active].querySelector('img');
    viewerImage.src = image.src;
    viewerImage.alt = image.alt;
    dialog.querySelector('#lightbox-title span').textContent = slides[active].dataset.title;
    viewerCaption.textContent = `${count.textContent} — ${slides[active].dataset.title}`;
    viewerStage.scrollTo(0,0);
  }
  function updateControls() {
    const visible = pool(category);
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.galleryFilter === category)));
    dots.forEach((button,index) => {
      button.hidden = !visible.includes(index);
      if (index === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-gallery-prev],[data-gallery-next]').forEach(button => { button.disabled = visible.length < 2; });
    count.textContent = `${String(visible.indexOf(active)+1).padStart(2,'0')} / ${String(visible.length).padStart(2,'0')}`;
    caption.textContent = slides[active].dataset.title;
    description.textContent = slides[active].dataset.description;
    updateViewer();
  }
  async function showSlide(index, group = category) {
    if (!slides[index]) return false;
    const ticket = ++pending;
    const source = slides[index].querySelector('img');
    viewport.setAttribute('aria-busy', 'true');
    status.classList.add('sr-only');
    status.textContent = `Loading ${slides[index].dataset.title}…`;
    viewerStatus.textContent = status.textContent;
    try {
      const image = new Image();
      image.src = source.src;
      await image.decode();
      if (ticket !== pending) return false;
      stopAnimation();
      active = index;
      category = group;
      slides.forEach((slide,i) => { slide.hidden = i !== active; });
      ambient.src = source.src;
      updateControls();
      status.textContent = `${count.textContent}: ${slides[index].dataset.title}`;
      viewerStatus.textContent = status.textContent;
      if (motionEnabled() && !dialog.open) animation = slides[index].animate([{opacity:.3, transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}], {duration:250,easing:'ease-out'});
      return true;
    } catch {
      if (ticket !== pending) return false;
      status.classList.remove('sr-only');
      status.textContent = 'This image could not load. Try another screen or try again.';
      viewerStatus.textContent = status.textContent;
      return false;
    } finally {
      if (ticket === pending) viewport.removeAttribute('aria-busy');
    }
  }
  function step(direction) {
    const visible = pool(category);
    const index = (visible.indexOf(active) + direction + visible.length) % visible.length;
    showSlide(visible[index]);
  }
  filters.forEach(button => button.addEventListener('click', () => {
    const group = button.dataset.galleryFilter;
    const visible = pool(group);
    showSlide(visible.includes(active) ? active : visible[0], group);
  }));
  dots.forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.galleryIndex))));
  root.querySelectorAll('[data-gallery-prev]').forEach(button => button.addEventListener('click', () => step(-1)));
  root.querySelectorAll('[data-gallery-next]').forEach(button => button.addEventListener('click', () => step(1)));
  root.querySelectorAll('[data-show-screen]').forEach(button => button.addEventListener('click', async event => {
    event.preventDefault();
    const changed = await showSlide(Number(button.dataset.showScreen), 'all');
    if (changed && matchMedia('(max-width:800px)').matches) {
      gallery.scrollIntoView({behavior:motionEnabled() ? 'smooth' : 'instant', block:'start'});
    }
  }));
  function keyboard(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); const visible = pool(category);
      showSlide(event.key === 'Home' ? visible[0] : visible.at(-1));
    }
  }
  viewport.addEventListener('keydown', keyboard);
  dialog.addEventListener('keydown', keyboard);
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-roledescription', 'carousel');
  slides.forEach((slide,index) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index+1} of ${slides.length}: ${slide.dataset.title}`);
  });
  gallery.querySelector('.gallery-filters').hidden = slides.length < 2;
  gallery.querySelector('.gallery-dots').hidden = slides.length < 2;
  gallery.querySelector('.gallery-arrows').hidden = slides.length < 2;
  gallery.querySelector('.gallery-expand').hidden = false;
  updateControls();

  function openViewer() {
    if (dialog.open) return;
    stopAnimation();
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    updateViewer();
    dialog.querySelector('[data-viewer-close]').focus();
  }
  let gesture;
  let swiped = false;
  viewport.addEventListener('pointerdown', event => {
    swiped = false;
    if (event.isPrimary && event.pointerType === 'touch' && !event.target.closest('button')) gesture = {x:event.clientX, y:event.clientY};
  }, {passive:true});
  viewport.addEventListener('pointercancel', () => { gesture = null; });
  viewport.addEventListener('pointerup', event => {
    if (!gesture) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      event.preventDefault(); swiped = true; step(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && event.target.closest('.gallery-open')) {
      // Handle the tap directly: browsers can suppress the click after a swipe.
      event.preventDefault(); openViewer();
    }
  });
  viewport.addEventListener('click', event => {
    if (event.target.closest('.gallery-open')) {
      event.preventDefault();
      if (!swiped) openViewer();
    }
    swiped = false;
  });
  gallery.querySelector('.gallery-expand').addEventListener('click', openViewer);
  dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
  zoom.addEventListener('click', () => {
    const expanded = zoom.getAttribute('aria-pressed') !== 'true';
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? 'Fit to screen' : 'Actual size';
    viewerStage.classList.toggle('is-zoomed', expanded);
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = savedOverflow;
    zoom.setAttribute('aria-pressed','false'); zoom.textContent = 'Actual size';
    viewerStage.classList.remove('is-zoomed');
    slides[active].querySelector('.gallery-open').focus({preventScroll:true});
  });
})();
