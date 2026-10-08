/* Local wallpaper preferences; artwork stays on this site's origin. */
(() => {
  'use strict';
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const navigation = document.querySelector('#navigation');
  if (!header || !navigation) return;

  const themes = [
    {id:'war', name:'War Sentinel', note:'Armored frontier', image:'scifi-sentinel', detail:'scifi-visor', kind:'character', eyes:[.255,.745,.417]},
    {id:'anime', name:'Anime Ravens', note:'The original artwork', image:'studio-ravens', detail:'studio-eyes', kind:'character', eyes:[.269,.776,.442]}
  ];
  const storageKey = 'odn-background-theme';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const compact = matchMedia('(max-width:1000px)');
  const menu = document.querySelector('.menu-btn');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'background-toggle';
  trigger.className = 'background-toggle';
  trigger.setAttribute('aria-controls', 'background-panel');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 6-5 4 3 4-6 4 8"/></svg><span>Background</span><svg class="background-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 4 3 3 3-3"/></svg>';
  navigation.insertBefore(trigger, navigation.querySelector('.nav-contact'));

  const panel = document.createElement('section');
  panel.id = 'background-panel';
  panel.className = 'background-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'background-title');
  panel.innerHTML = `<div class="background-heading"><div><span class="background-kicker">MAKE YOURSELF AT HOME</span><h2 id="background-title">Choose your background</h2></div><button class="background-close" type="button" aria-label="Close background menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
    <fieldset class="background-grid"><legend class="sr-only">Wallpaper themes</legend>${themes.map(theme => `
      <label class="background-choice"><input type="radio" name="background" value="${theme.id}" aria-label="${theme.name}"${theme.id === 'war' ? ' checked' : ''}><span class="background-preview"><img src="art/thumbnails/${theme.image}.webp" alt="" width="320" height="180" loading="lazy"><span class="background-check" aria-hidden="true">✓</span></span><span class="background-name">${theme.name}</span><span class="background-note">${theme.note}</span></label>`).join('')}
    </fieldset><p id="background-status" class="background-status" role="status" aria-live="polite">Pick your view.</p>`;
  header.append(panel);
  const status = panel.querySelector('#background-status');
  const choices = [...panel.querySelectorAll('input')];
  const images = [...document.querySelectorAll('.portrait-image,.portal-landscape,.studio-backdrop img,.collection-backdrop img')];
  const eyeImage = document.querySelector('.eyes-scene img');
  let wallpaper;
  if (!images.length) {
    wallpaper = document.createElement('div');
    wallpaper.className = 'background-wallpaper';
    wallpaper.setAttribute('aria-hidden', 'true');
    document.body.prepend(wallpaper);
  }

  let active = themes[0];
  let request = 0;
  let animations = [];
  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function syncMotion() {
    if (reduced.matches || root.dataset.motion === 'off') stopAnimations();
  }
  reduced.addEventListener('change', syncMotion);
  new MutationObserver(syncMotion).observe(root, {attributes:true, attributeFilter:['data-motion']});

  function closePanel(restoreFocus = false) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) (compact.matches ? menu : trigger)?.focus({preventScroll:true});
  }
  trigger.addEventListener('click', () => {
    if (!panel.hidden) { closePanel(true); return; }
    if (menu?.getAttribute('aria-expanded') === 'true') menu.click();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    panel.querySelector('input:checked').focus({preventScroll:true});
  });
  panel.querySelector('.background-close').addEventListener('click', () => closePanel(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); closePanel(true); }
  });
  document.addEventListener('click', event => {
    if (!panel.hidden && !panel.contains(event.target) && !trigger.contains(event.target)) closePanel();
  });
  document.addEventListener('focusin', event => {
    if (!panel.hidden && !panel.contains(event.target) && event.target !== trigger) closePanel();
  });
  compact.addEventListener('change', () => {
    if (!panel.hidden) closePanel(true);
  });

  function preload(src) {
    const image = new Image();
    image.src = src;
    return image.decode();
  }
  async function choose(theme, remember = true) {
    const ticket = ++request;
    const src = `art/${theme.image}.webp`;
    const detail = `art/${theme.detail || theme.image}.webp`;
    status.textContent = `Loading ${theme.name}…`;
    panel.setAttribute('aria-busy', 'true');
    try {
      await Promise.all([...new Set([src, ...(eyeImage ? [detail] : [])])].map(preload));
      if (ticket !== request) return;
      stopAnimations();
      images.forEach(image => { image.src = src; });
      if (eyeImage) {
        eyeImage.src = detail;
        [eyeImage.dataset.eyeLeft, eyeImage.dataset.eyeRight, eyeImage.dataset.eyeY] = theme.eyes;
      }
      if (wallpaper) wallpaper.style.backgroundImage = `url("${src}")`;
      root.dataset.background = theme.id;
      root.dataset.backgroundKind = theme.kind;
      active = theme;
      choices.forEach(choice => { choice.checked = choice.value === theme.id; });
      let saved = true;
      if (remember) {
        try { localStorage.setItem(storageKey, theme.id); } catch { saved = false; }
      }
      status.textContent = `${theme.name} selected. ${remember ? (saved ? 'Your choice stays on this device.' : 'Storage unavailable; applied to this page.') : 'Pick your view.'}`;
      if (remember && !reduced.matches && root.dataset.motion !== 'off') {
        animations = [...images, eyeImage, wallpaper].filter(Boolean).map(element => element.animate(
          [{opacity:0}, {opacity:getComputedStyle(element).opacity}], {duration:420, easing:'ease-out'}
        ));
      }
      window.dispatchEvent(new CustomEvent('odn:background-change', {detail:{id:theme.id}}));
    } catch {
      if (ticket !== request) return;
      choices.forEach(choice => { choice.checked = choice.value === active.id; });
      status.textContent = `Couldn’t load ${theme.name}. Please try again.`;
    } finally {
      if (ticket === request) panel.removeAttribute('aria-busy');
    }
  }
  panel.addEventListener('change', event => {
    const theme = themes.find(item => item.id === event.target.value);
    if (theme) choose(theme);
  });
  let saved;
  try {
    const previous = localStorage.getItem(storageKey);
    // Keep returning visitors in the same visual family after retiring themes.
    saved = ['scifi', 'battle', 'fantasy'].includes(previous) ? 'war' : previous === 'eyes' ? 'anime' : previous;
    if (saved !== previous) localStorage.setItem(storageKey, saved);
  } catch { /* Switching still works without storage. */ }
  choose(themes.find(theme => theme.id === saved) || themes[0], false);
})();
