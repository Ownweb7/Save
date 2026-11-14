import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'apps.js'), 'utf8').replace(/^window\.ODN_APPS\s*=\s*/, '').replace(/;\s*$/, ''));
const details = JSON.parse(fs.readFileSync(path.join(root, 'app-pages.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const url = value => value.split('/').map(encodeURIComponent).join('/');
const number = value => String(value).padStart(2, '0');
const arrow = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const chevron = direction => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="${direction === 'prev' ? 'm14 5-7 7 7 7' : 'm10 5 7 7-7 7'}"/></svg>`;
const tabIcons = ['<path d="m12 3 9 9-9 9-9-9Z"/>', '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>', '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>'];

for (const [index, app] of catalog.entries()) {
  const data = details[app.id];
  const folder = `App Images/${app.name}`;
  const files = fs.readdirSync(path.join(root, folder)).filter(file => /\.(png|jpe?g|webp|avif)$/i.test(file)).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
  const screens = files.map((file, i) => {
    const fallback = file.replace(/\.[^.]+$/, '').replace(/^\d+[-_]?/, '').replace(/-\d+x\d+$/, '').replace(/[-_]+/g, ' ');
    const [title, description, group] = data.screens[file] || [fallback || `${app.name} — screen ${i+1}`, `Explore ${app.name} in this app image.`, 'App screens'];
    return {src:url(`${folder}/${file}`), title, description, group};
  });
  const groups = [...new Set(screens.map(screen => screen.group))];
  const functions = screens.length ? screens.map((screen,i) => [screen.title, screen.description, i]) : data.functions;
  const previous = catalog[(index + catalog.length - 1) % catalog.length];
  const next = catalog[(index + 1) % catalog.length];
  const gallery = screens.length ? `
    <div class="gallery-filters" aria-label="Filter app images" hidden>${['All screens', ...groups].map((group,i) => `<button type="button" data-gallery-filter="${escape(i ? group : 'all')}" aria-pressed="${i === 0}">${escape(group)}</button>`).join('')}</div>
    <div class="gallery-viewport" id="gallery-viewport" aria-label="${escape(app.name)} images">
      <img class="gallery-ambient" src="${screens[0].src}" alt="" aria-hidden="true">
      ${screens.map((screen,i) => `<figure class="gallery-slide" data-group="${escape(screen.group)}" data-title="${escape(screen.title)}" data-description="${escape(screen.description)}"${i ? ' hidden' : ''}>
        <a class="gallery-open" href="${screen.src}" target="_blank" rel="noopener" aria-label="Enlarge ${escape(screen.title)}"><img src="${screen.src}" alt="${escape(`${app.name}: ${screen.title}. ${screen.description}`)}" width="800" height="1400" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></a>
        <figcaption class="sr-only">${escape(screen.title)}</figcaption></figure>`).join('')}
      <div class="gallery-arrows" hidden><button type="button" data-gallery-prev aria-label="Previous image">${chevron('prev')}</button><button type="button" data-gallery-next aria-label="Next image">${chevron('next')}</button></div>
      <button class="gallery-expand" type="button" aria-label="Open full-screen image viewer" hidden>${arrow}<span>Full view</span></button>
    </div>
    <div class="gallery-caption"><div><span class="case-eyebrow">A CLOSER LOOK</span><h2 id="gallery-caption">${escape(screens[0].title)}</h2></div><span class="gallery-count" aria-hidden="true">01 / ${number(screens.length)}</span></div>
    <p class="gallery-description">${escape(screens[0].description)}</p>
    <div class="gallery-dots" aria-label="Choose an app image" hidden>${screens.map((screen,i) => `<button type="button" data-gallery-index="${i}" aria-label="Show image ${i+1}: ${escape(screen.title)}"${i === 0 ? ' aria-current="true"' : ''}><span></span></button>`).join('')}</div>
    <p class="gallery-status sr-only" role="status" aria-live="polite"></p>
    <noscript><ol class="gallery-originals">${screens.map(screen => `<li><a href="${screen.src}" target="_blank" rel="noopener">${escape(screen.title)} ↗</a></li>`).join('')}</ol></noscript>` : `
    <div class="gallery-brand"><span class="case-eyebrow">ODN &amp; SONS / ${escape(app.category.toUpperCase())}</span><div class="brand-art-orbit" aria-hidden="true"></div><img src="${url(`icons/${app.icon}`)}" alt="${escape(app.name)} app icon" width="180" height="180"><h2>${escape(app.name)}</h2><p>${escape(app.tag)}</p><span class="gallery-brand-note">${escape(app.tag.toUpperCase())}</span></div>`;
  const heading = `<div class="case-heading"><p class="case-eyebrow">${number(index+1)} / ${escape(app.category.toUpperCase())} · ANDROID APP</p><div class="case-title"><img src="${url(`icons/${app.icon}`)}" alt="" width="52" height="52"><h1 id="product-title">${escape(app.name)}</h1></div><p class="product-tagline">${escape(app.tag)}</p><p class="case-byline">DESIGNED &amp; BUILT BY ODN &amp; SONS</p>${app.terms ? `<p class="case-legal"><a href="${app.policy}">Privacy policy</a><span aria-hidden="true">·</span><a href="${app.terms}">Terms of service</a></p>` : ''}</div>`;
  const markup = `<main id="main" class="app-case" style="--app-color:${app.color}">
<div class="case-topline"><a class="product-back" href="apps.html"><span aria-hidden="true">←</span> All apps</a><span class="case-edition">THE APP COLLECTION <i>/</i> ${number(index+1)} OF ${number(catalog.length)}</span></div>
<div class="case-layout">
  ${heading}
  <section class="product-gallery" aria-label="${escape(app.name)} gallery">${gallery}</section>
  <article class="product-details" aria-labelledby="product-title">
    <div class="detail-tabs" role="tablist" aria-label="App information" hidden>${['Overview','Functions','Details'].map((name,i) => `<button type="button" role="tab" id="tab-${name.toLowerCase()}" aria-controls="${name.toLowerCase()}" aria-selected="${i===0}" tabindex="${i===0 ? 0 : -1}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">${tabIcons[i]}</svg>${name}</button>`).join('')}</div>
    <section class="detail-panel" id="overview" aria-labelledby="overview-title"><h2 id="overview-title">${escape(data.intro)}</h2><p class="product-description">${escape(app.desc)}</p><ul class="product-feature-grid">${app.features.map((feature,i) => `<li><span>${number(i+1)}</span><div><h3>${escape(feature)}</h3><p>${escape(data.featureNotes[i])}</p></div></li>`).join('')}</ul><dl class="case-facts"><div><dt>Platform</dt><dd>Android</dd></div><div><dt>Category</dt><dd>${escape(app.category)}</dd></div><div><dt>Studio</dt><dd>ODN &amp; Sons</dd></div></dl></section>
    <section class="detail-panel" id="functions" aria-labelledby="functions-title"><h2 id="functions-title">A closer look at the functions.</h2><p class="panel-intro">${screens.length ? 'Choose a function to see it in the gallery.' : 'Simple tools to help you make time for what matters.'}</p><ol class="function-list">${functions.map(([title,desc,slide],i) => `<li>${slide !== undefined ? `<a class="function-jump" href="${screens[slide].src}" target="_blank" rel="noopener" data-show-screen="${slide}">` : '<div class="function-description">'}<span class="function-number">${number(i+1)}</span><span><strong>${escape(title)}</strong><span class="function-copy">${escape(desc)}</span></span>${slide !== undefined ? `<span class="function-arrow" aria-hidden="true">${arrow}</span></a>` : '</div>'}</li>`).join('')}</ol></section>
    <section class="detail-panel" id="details" aria-labelledby="details-title"><h2 id="details-title">The useful details.</h2><div class="detail-note"><h3>Made for Android</h3><p>Find ${escape(app.name)} on Google Play for current availability, device compatibility and any optional upgrades.</p></div>${data.upgradeNote ? `<div class="detail-note"><h3>Included and Premium</h3><p>${escape(data.upgradeNote)}</p></div>` : ''}<div class="detail-note"><h3>Your privacy</h3><p>Read the app-specific policy for information about data and permissions.</p><a href="${app.policy}">Read the privacy policy ${arrow}</a></div>${app.terms ? `<div class="detail-note"><h3>Terms of service</h3><p>The terms that apply to using ${escape(app.name)}.</p><a href="${app.terms}">Read the terms of service ${arrow}</a></div>` : ''}<div class="detail-note"><h3>A little help?</h3><p>Questions or feedback about ${escape(app.name)}? Talk to our independent studio in Hisar, India.</p><a href="contact.html">Contact the studio ${arrow}</a></div></section>
    <div class="product-actions"><a class="btn btn-gold product-store" href="${escape(app.url)}" target="_blank" rel="noopener">Get on Google Play ${arrow}</a><a class="product-policy" href="${app.policy}">Privacy policy</a>${app.terms ? `<a class="product-policy" href="${app.terms}">Terms of service</a>` : ''}</div>
    <p class="case-signature">THOUGHTFULLY MADE. <span>FOR YOUR EVERYDAY.</span></p>
  </article>
</div>
<nav class="product-pagination" aria-label="Explore more apps"><a href="${previous.page}"><span>← PREVIOUS APP</span><strong>${escape(previous.name)}</strong></a><a href="${next.page}"><span>NEXT APP →</span><strong>${escape(next.name)}</strong></a></nav>
${screens.length ? `<dialog class="gallery-lightbox" aria-labelledby="lightbox-title"><div class="lightbox-toolbar"><h2 id="lightbox-title">${escape(app.name)} / <span>${escape(screens[0].title)}</span></h2><div><button type="button" data-viewer-zoom aria-pressed="false">Actual size</button><button type="button" data-viewer-close aria-label="Close image viewer">✕</button></div></div><div class="lightbox-stage"><img alt=""></div><div class="lightbox-footer"><button type="button" data-gallery-prev aria-label="Previous image">${chevron('prev')}</button><p class="lightbox-caption"></p><button type="button" data-gallery-next aria-label="Next image">${chevron('next')}</button></div></dialog>` : ''}
</main>`;
  const filename = path.join(root, app.page);
  let html = fs.readFileSync(filename, 'utf8');
  html = html.replace(/<main\b[\s\S]*?<\/main>/, markup);
  if (!/href="app-pages\.css(\?v=[^"]*)?"/.test(html)) html = html.replace('</head>', '<link rel="stylesheet" href="app-pages.css">\n</head>');
  if (!/src="app-pages\.js(\?v=[^"]*)?"/.test(html)) html = html.replace('</body>', '<script src="app-pages.js"></script>\n</body>');
  fs.writeFileSync(filename, html);
  console.log(`${app.page}: ${screens.length} app images`);
}

// ---- Fast loading: small icon copies and cache-busting version tags ----
// icons/web/<name>.<hash>.webp are small copies of icons/<name>.png, named by the
// first 8 hex digits of the PNG's SHA-1. When a PNG is replaced (a new upload), its
// hash changes, no copy matches, and pages use the PNG until a new copy is made,
// so an out-of-date icon is never shown.
// Every local image, stylesheet and script URL in the pages then gets ?v=<hash of the
// file>. Browsers cache these for a year (vercel.json) and fetch a file again as soon
// as it changes, because its URL changes with it.
const hash8 = file => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
const encodePath = p => p.split('/').map(encodeURIComponent).join('/');
const iconCopy = {};
for (const file of fs.readdirSync(path.join(root, 'icons'))) {
  if (!file.endsWith('.png') || file === 'favicon.png') continue;
  const copy = `icons/web/${file.slice(0, -4)}.${hash8(path.join(root, 'icons', file))}.webp`;
  if (fs.existsSync(path.join(root, copy))) iconCopy[`icons/${file}`] = copy;
  else console.warn(`icons/${file}: no small copy for this version yet; pages use the PNG`);
}
const isAsset = url => !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url) && /\.(png|webp|jpe?g|gif|svg|ico|css|js)$/i.test(url.split('?')[0]);
let tagged = 0, swapped = 0;
const missing = new Set();
for (const page of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const file = path.join(root, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/\b(src|href)="([^"]+)"/g, (whole, attr, url) => {
    if (!isAsset(url)) return whole;
    // backgrounds.js swaps the background art by its plain URL; a version tag here
    // would make browsers download each picture twice, so art/ stays untagged.
    if (/^art\//.test(url)) return `${attr}="${url.split('?')[0]}"`;
    let target = decodeURIComponent(url.split('?')[0]);
    // A page written by an earlier build may already point at a small copy; trace it
    // back to its PNG so a replaced icon is picked up instead of the old copy.
    const copyOf = target.match(/^icons\/web\/(.+)\.[0-9a-f]{8}\.webp$/);
    if (copyOf) target = `icons/${copyOf[1]}.png`;
    if (attr === 'src' && iconCopy[target]) { target = iconCopy[target]; swapped++; }
    if (!fs.existsSync(path.join(root, target))) { missing.add(`${page}: ${target}`); return whole; }
    tagged++;
    return `${attr}="${encodePath(target)}?v=${hash8(path.join(root, target))}"`;
  });
  if (after !== before) fs.writeFileSync(file, after);
}
for (const m of missing) console.warn(`missing asset, left unversioned: ${m}`);
console.log(`version tags: ${tagged} asset URLs (${swapped} using small icon copies)`);
