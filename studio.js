/* The studio's visual layer: native scrolling, progressive motion, no libraries. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const root = document.documentElement;
  const hero = document.querySelector('.studio-hero');
  const studioWorld = document.querySelector('.studio-world');
  const appStage = document.querySelector('.app-stage');
  const stageMotion = {x:0, y:0, turn:0, targetX:0, targetY:0, targetTurn:0};
  const worldMotion = {x:0, y:0, turn:0, lookX:0, lookY:0, targetX:0, targetY:0, targetTurn:0, targetLookX:0, targetLookY:0};
  let stageBounds = null;
  let manuallyPaused = false;
  try { manuallyPaused = sessionStorage.getItem('odn-motion-paused') === '1'; } catch { /* Preferences are optional. */ }
  let enabled = !reduced.matches && !manuallyPaused;
  let width = innerWidth;
  let height = innerHeight;
  let heroHeight = hero?.offsetHeight || height;
  let scrollPosition = scrollY;
  const pointer = {x: .76, y: .38, targetX: .76, targetY: .38, active: false};
  const activeAnimations = new Set();

  // The hero introduces every app with a keyboard-accessible, user-controlled preview.
  const showcaseTabs = [...document.querySelectorAll('.showcase-tabs [role="tab"]')];
  const worldApps = [...document.querySelectorAll('.world-app[data-world-app]')];
  const showcasePanel = document.querySelector('#showcase-panel');
  const showcasePreviews = showcasePanel ? [...showcasePanel.querySelectorAll('[data-preview]')] : [];
  let activeShowcase = appStage?.dataset.activeApp || 'save';
  let showcaseAnimation = null;
  function selectShowcase(id, focus = false, animate = true) {
    const app = window.ODN_APPS?.find(item => item.id === id);
    const selectedTab = showcaseTabs.find(tab => tab.dataset.showcase === id);
    if (!app || !selectedTab || !showcasePanel || !appStage) return;
    const changed = activeShowcase !== id;
    activeShowcase = id;
    showcaseTabs.forEach(tab => {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    worldApps.forEach(link => {
      const selected = link.dataset.worldApp === id;
      if (selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      link.classList.toggle('is-selected', selected);
    });
    if (studioWorld) {
      studioWorld.dataset.activeApp = id;
      studioWorld.style.setProperty('--preview-accent', app.color);
    }
    showcasePanel.setAttribute('aria-labelledby', selectedTab.id);
    appStage.dataset.activeApp = id;
    appStage.style.setProperty('--preview-accent', app.color);
    const name = document.querySelector('#showcase-name');
    const tag = document.querySelector('#showcase-tag');
    const icon = document.querySelector('#showcase-icon');
    const features = document.querySelector('#showcase-features');
    const store = document.querySelector('#showcase-store');
    const aboutLink = document.querySelector('#showcase-about');
    if (name) name.textContent = app.name;
    if (tag) tag.textContent = app.tag;
    if (icon) {
      icon.src = `icons/${encodeURIComponent(app.icon)}`;
      icon.alt = '';
    }
    if (features) features.replaceChildren(...app.features.map(feature => {
      const item = document.createElement('li');
      item.textContent = feature;
      return item;
    }));
    if (store) {
      store.href = app.url;
      store.textContent = `${id === 'will' ? 'Find' : 'Get'} ${app.name} on Google Play`;
    }
    if (aboutLink) {
      aboutLink.dataset.app = id;
      aboutLink.href = `#app-${id}`;
      aboutLink.textContent = `About ${app.name}`;
    }
    showcasePreviews.forEach(preview => { preview.hidden = preview.dataset.preview !== id; });
    if (focus) selectedTab.focus();
    if (showcaseAnimation) {
      showcaseAnimation.cancel();
      activeAnimations.delete(showcaseAnimation);
      showcaseAnimation = null;
    }
    if (changed && animate && enabled && showcasePanel.animate) {
      const animation = showcasePanel.animate([
        {opacity: .35, transform: 'translateY(8px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 280, easing: 'cubic-bezier(.16,1,.3,1)'});
      showcaseAnimation = animation;
      activeAnimations.add(animation);
      animation.finished.then(() => {
        activeAnimations.delete(animation);
        if (showcaseAnimation === animation) showcaseAnimation = null;
      }).catch(() => {});
    }
    sizeStage();
    queueScroll();
  }
  showcaseTabs.forEach(tab => {
    tab.addEventListener('click', () => selectShowcase(tab.dataset.showcase));
    tab.addEventListener('keydown', event => {
      let index = showcaseTabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index + 1) % showcaseTabs.length;
      else if (event.key === 'ArrowLeft') index = (index + showcaseTabs.length - 1) % showcaseTabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = showcaseTabs.length - 1;
      else return;
      event.preventDefault();
      selectShowcase(showcaseTabs[index].dataset.showcase, true);
    });
  });
  worldApps.forEach(link => {
    link.addEventListener('click', event => {
      const id = link.dataset.worldApp;
      const selectedTab = showcaseTabs.find(tab => tab.dataset.showcase === id);
      const preview = document.querySelector('#app-preview');
      if (!selectedTab || !preview) return;
      event.preventDefault();
      selectShowcase(id);
      selectedTab.focus({preventScroll:true});
      preview.scrollIntoView({behavior:enabled?'smooth':'instant', block:'start'});
    });
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'motion-toggle';
  toggle.className = 'motion-toggle';
  document.body.append(toggle);
  const progress = document.createElement('div');
  progress.className = 'page-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const canvas = document.createElement('canvas');
  canvas.className = 'studio-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', {alpha:true});
  let frame = 0;
  let lastTime = 0;
  let sceneTime = 0;
  let pixelRatio = 1;

  // Deterministic dots avoid noise jumps on resize and do not require images.
  const dots = Array.from({length:56}, (_, i) => ({
    x: ((i * 73.731 + 17) % 100) / 100,
    y: ((i * 37.919 + 23) % 100) / 100,
    radius: i % 7 === 0 ? 1.3 : .65
  }));
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;
  function sizeStage() {
    if (!appStage) return;
    const rect = appStage.getBoundingClientRect();
    stageBounds = {left:rect.left, top:rect.top + scrollY, width:rect.width, height:rect.height};
  }
  function updateStage(reset=false) {
    if (!appStage) return;
    for (const key of ['x','y','turn']) {
      const targetKey = `target${key[0].toUpperCase()}${key.slice(1)}`;
      if (reset) stageMotion[key] = stageMotion[targetKey] = 0;
      else stageMotion[key] += (stageMotion[targetKey]-stageMotion[key])*.1;
    }
    appStage.style.setProperty('--stage-x',`${stageMotion.x.toFixed(2)}px`);
    appStage.style.setProperty('--stage-y',`${stageMotion.y.toFixed(2)}px`);
    appStage.style.setProperty('--stage-turn',`${stageMotion.turn.toFixed(2)}deg`);
  }
  function updateWorld(reset=false) {
    if (!studioWorld) return;
    for (const key of ['x','y','turn','lookX','lookY']) {
      const targetKey = `target${key[0].toUpperCase()}${key.slice(1)}`;
      if (reset) worldMotion[key] = worldMotion[targetKey] = 0;
      else worldMotion[key] += (worldMotion[targetKey]-worldMotion[key])*.1;
    }
    studioWorld.style.setProperty('--world-x',`${worldMotion.x.toFixed(2)}px`);
    studioWorld.style.setProperty('--world-y',`${worldMotion.y.toFixed(2)}px`);
    studioWorld.style.setProperty('--world-turn',`${worldMotion.turn.toFixed(2)}deg`);
    studioWorld.style.setProperty('--world-look-x',`${worldMotion.lookX.toFixed(2)}px`);
    studioWorld.style.setProperty('--world-look-y',`${worldMotion.lookY.toFixed(2)}px`);
  }
  function project(u, v, scale, time, centerX, centerY) {
    const radius = 1 + .09 * sin(u * 3 + time * .3);
    const tube = .32 + .055 * cos(u * 3 - time * .5);
    let x = (radius + tube * cos(v)) * cos(u);
    let y = (radius + tube * cos(v)) * sin(u);
    let z = tube * sin(v) + .17 * sin(u * 2 + time * .2);
    const rx = .94 + (pointer.y - .5) * .5;
    const ry = -.5 + (pointer.x - .5) * .8 + time * .075;
    const rz = -.55 + scrollPosition / Math.max(heroHeight,1) * .7;
    const y1 = y * cos(rx) - z * sin(rx);
    z = y * sin(rx) + z * cos(rx); y = y1;
    const x1 = x * cos(ry) + z * sin(ry);
    z = -x * sin(ry) + z * cos(ry); x = x1;
    const x2 = x * cos(rz) - y * sin(rz);
    y = x * sin(rz) + y * cos(rz); x = x2;
    const perspective = 4.5 / (4.5 + z);
    return [centerX + x * scale * perspective, centerY + y * scale * perspective, z];
  }
  function drawScene() {
    if (!ctx) return;
    ctx.clearRect(0,0,width,height);
    const cursorX = pointer.x * width, cursorY = pointer.y * height;
    // Small star points and nearby connections keep the ambient field quiet.
    const nearStars = [];
    const responsive = enabled && finePointer.matches && pointer.active;
    dots.forEach((dot,index) => {
      let x = dot.x * width, y = (dot.y * height - scrollPosition * .045) % height;
      if (y < 0) y += height;
      const distance = Math.hypot(x - cursorX, y - cursorY);
      const proximity = responsive ? Math.max(0,1 - distance / 190) : 0;
      if (proximity > 0) {
        const force = proximity * 9;
        x += (x - cursorX) / Math.max(1,distance) * force;
        y += (y - cursorY) / Math.max(1,distance) * force;
        nearStars.push({x,y,proximity});
      }
      const shimmer = enabled ? .025 * sin(sceneTime * .7 + index) : 0;
      ctx.fillStyle = `rgba(210,199,155,${.16 + shimmer + proximity * .48})`;
      ctx.beginPath(); ctx.arc(x,y,dot.radius + proximity * .35,0,PI*2); ctx.fill();
      if (proximity > .5) {
        ctx.fillStyle = `rgba(214,197,143,${proximity * .06})`;
        ctx.beginPath(); ctx.arc(x,y,4,0,PI*2); ctx.fill();
      }
    });
    // Only connect stars around the pointer, with a strict limit on line work.
    let connectionCount = 0;
    ctx.lineWidth = .6;
    for (let a=0; a<nearStars.length && connectionCount<10; a++) {
      for (let b=a+1; b<nearStars.length && connectionCount<10; b++) {
        const first = nearStars[a], second = nearStars[b];
        const distance = Math.hypot(first.x-second.x,first.y-second.y);
        if (distance > 125) continue;
        const opacity = (1-distance/125) * Math.min(first.proximity,second.proximity) * .28;
        ctx.strokeStyle = `rgba(214,197,143,${opacity})`;
        ctx.beginPath(); ctx.moveTo(first.x,first.y); ctx.lineTo(second.x,second.y); ctx.stroke();
        connectionCount++;
      }
    }
    if (!hero || studioWorld) return;
    const fade = Math.max(0, 1 - scrollPosition / (heroHeight * .9));
    if (fade <= 0) return;
    const small = width < 761;
    const scale = stageBounds ? Math.min(stageBounds.width*.36,stageBounds.height*.48,245) : Math.min(width*.2,heroHeight*.4,260);
    const centerX = stageBounds ? stageBounds.left + stageBounds.width*.64 : width*.78;
    const centerY = stageBounds ? stageBounds.top + stageBounds.height*.48 - scrollPosition : heroHeight*.46 + 70 - scrollPosition*.2;
    const time = enabled ? sceneTime : 0;
    ctx.save();
    ctx.globalAlpha = fade * (small ? .3 : .55);
    const glow = ctx.createRadialGradient(centerX,centerY,5,centerX,centerY,scale*1.55);
    glow.addColorStop(0,'#67e8f905'); glow.addColorStop(.55,'#67e8f91b'); glow.addColorStop(.8,'#ab93ff0b'); glow.addColorStop(1,'#67e8f900');
    ctx.fillStyle = glow; ctx.fillRect(centerX-scale*1.6,centerY-scale*1.6,scale*3.2,scale*3.2);
    // Two families of continuous curves form a twisting, three-dimensional torus.
    for (let ring=0; ring<58; ring++) {
      const u = ring / 58 * PI * 2;
      const depth = project(u,0,scale,time,centerX,centerY)[2];
      const alpha = Math.max(.07, .38 - depth*.15);
      ctx.strokeStyle = ring % 7 === 0 ? `rgba(171,147,255,${alpha*.8})` : `rgba(214,197,143,${alpha})`;
      ctx.lineWidth = ring % 7 === 0 ? .8 : .55;
      ctx.beginPath();
      for (let step=0; step<=48; step++) {
        const point = project(u,step/48*PI*2,scale,time,centerX,centerY);
        if (step===0) ctx.moveTo(point[0],point[1]); else ctx.lineTo(point[0],point[1]);
      }
      ctx.stroke();
    }
    for (let ring=0; ring<22; ring++) {
      ctx.strokeStyle = ring % 5 === 0 ? '#ab93ff88' : '#67e8f966';
      ctx.lineWidth = .6; ctx.beginPath();
      for (let step=0; step<=100; step++) {
        const point = project(step/100*PI*2,ring/22*PI*2,scale,time,centerX,centerY);
        if(step===0) ctx.moveTo(point[0],point[1]); else ctx.lineTo(point[0],point[1]);
      }
      ctx.stroke();
    }
    // Broken orbital paths add a little depth around the app preview.
    ctx.translate(centerX,centerY);
    ctx.rotate(-.38 + time * .025);
    ctx.lineWidth = .7;
    ctx.strokeStyle = '#67e8f94d';
    ctx.beginPath(); ctx.ellipse(0,0,scale*1.4,scale*.54,0,.22*PI,1.24*PI); ctx.stroke();
    ctx.rotate(.86);
    ctx.strokeStyle = '#ab93ff44';
    ctx.beginPath(); ctx.ellipse(0,0,scale*1.42,scale*.64,0,1.08*PI,1.82*PI); ctx.stroke();
    ctx.restore();
  }
  function loop(timestamp) {
    frame = 0;
    if (!enabled || document.hidden) return;
    if (timestamp-lastTime >= 32) {
      sceneTime += Math.min((timestamp-lastTime)/1000,.05);
      lastTime = timestamp;
      pointer.x += (pointer.targetX-pointer.x)*.07;
      pointer.y += (pointer.targetY-pointer.y)*.07;
      updateStage();
      updateWorld();
      drawScene();
    }
    frame = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (!frame && enabled && !document.hidden && (ctx||appStage||studioWorld)) { lastTime=performance.now(); frame=requestAnimationFrame(loop); }
  }
  function sizeScene() {
    width=innerWidth; height=innerHeight; heroHeight=hero?.offsetHeight || height;
    sizeStage();
    pixelRatio=Math.min(devicePixelRatio || 1,1.5);
    canvas.width=Math.round(width*pixelRatio); canvas.height=Math.round(height*pixelRatio);
    ctx?.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    drawScene();
  }

  function animateIn(element, delay=0) {
    if (!enabled || !element.animate) return;
    const isTitle=element.classList.contains('title-line');
    const animation=element.animate(isTitle ? [
      {transform:'perspective(1000px) translateY(30px) rotateX(18deg)',opacity:0,clipPath:'inset(0 0 100% 0)'},
      {transform:'perspective(1000px) translateY(0) rotateX(0)',opacity:1,clipPath:'inset(0 0 0% 0)'}
    ] : [
      {transform:'translateY(38px)',opacity:0},
      {transform:'translateY(0)',opacity:1}
    ], {duration:isTitle?850:600,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
    activeAnimations.add(animation);
    animation.finished.then(()=>activeAnimations.delete(animation)).catch(()=>{});
  }
  const statement=document.querySelector('.scroll-statement');
  const statementWords=[];
  if (statement) {
    const walker=document.createTreeWalker(statement,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const fragment=document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word=>{
        if(!word.trim()) { fragment.append(document.createTextNode(word)); return; }
        const span=document.createElement('span'); span.className='statement-word'; span.textContent=word;
        statementWords.push(span); fragment.append(span);
      });
      node.replaceWith(fragment);
    });
  }
  // Each word rolls around its baseline as its heading enters the viewport.
  const rollingHeadings=[...document.querySelectorAll('.section-heading h2,.contact-banner h2,.page-hero h1')];
  rollingHeadings.forEach(heading=>{
    heading.classList.add('roll-heading');
    const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const fragment=document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word=>{
        if(!word.trim()) { fragment.append(document.createTextNode(word)); return; }
        const span=document.createElement('span');
        span.className='roll-word'; span.textContent=word; fragment.append(span);
      });
      node.replaceWith(fragment);
    });
  });
  const projectGrid=document.querySelector('.app-grid');
  const rollingCards=[...document.querySelectorAll('.app-card')];
  rollingCards.forEach(card=>{
    card.classList.add('roll-card');
    card.addEventListener('pointermove',event=>{
      if(!enabled||!finePointer.matches) return;
      const rect=card.getBoundingClientRect();
      const x=Math.max(0,Math.min(100,(event.clientX-rect.left)/Math.max(1,rect.width)*100));
      const y=Math.max(0,Math.min(100,(event.clientY-rect.top)/Math.max(1,rect.height)*100));
      card.style.setProperty('--card-x',`${x.toFixed(1)}%`);
      card.style.setProperty('--card-y',`${y.toFixed(1)}%`);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.removeProperty('--card-x'); card.style.removeProperty('--card-y');
    });
  });
  function resetCardGlows() {
    rollingCards.forEach(card=>{
      card.style.removeProperty('--card-x'); card.style.removeProperty('--card-y');
    });
  }
  // Duplicate only the visual label; assistive technology reads the original once.
  document.querySelectorAll('.nav-links>a,.hero-links>a').forEach(link=>{
    [...link.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim()).forEach(node=>{
      const label=document.createElement('span'); label.className='roll-label';
      const front=document.createElement('span'); front.className='roll-label-front'; front.textContent=node.textContent.trim();
      const back=front.cloneNode(true); back.className='roll-label-back'; back.setAttribute('aria-hidden','true');
      label.append(front,back); node.replaceWith(label);
    });
  });
  const projectImages=[...document.querySelectorAll('.app-art img')];
  let scrollScheduled=false;
  function updateScroll() {
    scrollScheduled=false; scrollPosition=scrollY;
    const max=root.scrollHeight-innerHeight;
    progress.style.transform=`scaleX(${max>0?Math.min(1,scrollPosition/max):0})`;
    document.querySelector('.site-header')?.classList.toggle('scrolled',scrollPosition>20);
    const statementTop=statement?.getBoundingClientRect().top;
    const imageRects=projectImages.map(image=>image.getBoundingClientRect());
    const headingTops=rollingHeadings.map(heading=>heading.getBoundingClientRect().top);
    const gridTop=projectGrid?.getBoundingClientRect().top || 0;
    // Use untransformed layout offsets so scroll transforms cannot feed back into themselves.
    const cardTops=rollingCards.map(card=>gridTop+card.offsetTop);
    const cardHeights=rollingCards.map(card=>card.offsetHeight);
    if(statement) {
      const reveal=enabled?Math.max(0,Math.min(1,(height*.85-statementTop)/(height*.5))):1;
      statementWords.forEach((word,index)=>word.style.setProperty('--lit',String(Math.max(0,Math.min(1,reveal*statementWords.length-index)))));
    }
    projectImages.forEach((image,index)=>{
      const rect=imageRects[index];
      const drift=enabled&&width>760?Math.max(-16,Math.min(16,(rect.top+rect.height/2-height/2)*.035)):0;
      image.style.setProperty('--art-drift',`${drift}px`);
    });
    rollingHeadings.forEach((heading,index)=>{
      const entrance=enabled?Math.max(0,Math.min(1,(headingTops[index]-height*.6)/(height*.4))):0;
      heading.style.setProperty('--word-roll',`${entrance*55}deg`);
      heading.style.setProperty('--word-lift',`${entrance*16}px`);
    });
    rollingCards.forEach((card,index)=>{
      const distance=Math.min(height*.42,cardHeights[index]*.8);
      const entrance=enabled&&!card.hidden?Math.max(0,Math.min(1,(cardTops[index]-height+distance)/Math.max(1,distance))):0;
      card.style.setProperty('--roll-angle',`${entrance*8}deg`);
      card.style.setProperty('--roll-lift',`${entrance*20}px`);
    });
    if(!enabled) drawScene();
  }
  function queueScroll() { if(!scrollScheduled) { scrollScheduled=true; requestAnimationFrame(updateScroll); } }
  function updateMotion() {
    enabled=!reduced.matches&&!manuallyPaused;
    root.dataset.motion=enabled?'on':'off';
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'Pause background and scroll animations':'Enable background and scroll animations');
    toggle.disabled=reduced.matches;
    toggle.title=reduced.matches?'Motion is disabled by your system preference':enabled?'Pause visual motion':'Enable visual motion';
    toggle.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">${enabled?'<path d="M3 2h2v8H3zm4 0h2v8H7z"/>':'<path d="m3 1 8 5-8 5z"/>'}</svg><span>Motion ${enabled?'on':'off'}</span>`;
    if(!enabled) {
      cancelAnimationFrame(frame); frame=0;
      activeAnimations.forEach(animation=>animation.cancel()); activeAnimations.clear();
      document.querySelectorAll('.app-art,.magnetic').forEach(element=>{
        element.style.removeProperty('--tilt-x'); element.style.removeProperty('--tilt-y'); element.style.removeProperty('translate');
      });
      pointer.x=pointer.targetX=.76; pointer.y=pointer.targetY=.38; pointer.active=false;
      resetCardGlows();
      updateStage(true);
      updateWorld(true);
      drawScene();
    } else startLoop();
    updateScroll();
  }
  toggle.addEventListener('click',()=>{
    manuallyPaused=!manuallyPaused;
    try { sessionStorage.setItem('odn-motion-paused',manuallyPaused?'1':'0'); } catch { /* Continue without storage. */ }
    updateMotion();
  });
  reduced.addEventListener('change',updateMotion);
  addEventListener('pointermove',event=>{
    if(!enabled||!finePointer.matches) return;
    pointer.active=true;
    pointer.targetX=event.clientX/width; pointer.targetY=event.clientY/height;
    root.style.setProperty('--pointer-x',`${event.clientX}px`); root.style.setProperty('--pointer-y',`${event.clientY}px`);
  },{passive:true});
  appStage?.addEventListener('pointermove',event=>{
    if(!enabled||!finePointer.matches) return;
    const rect=appStage.getBoundingClientRect();
    const x=Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/Math.max(1,rect.width)-.5));
    const y=Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/Math.max(1,rect.height)-.5));
    stageMotion.targetX=x*24; stageMotion.targetY=y*20; stageMotion.targetTurn=x*4;
  },{passive:true});
  appStage?.addEventListener('pointerleave',()=>{
    stageMotion.targetX=0; stageMotion.targetY=0; stageMotion.targetTurn=0;
  });
  studioWorld?.addEventListener('pointermove',event=>{
    if(!enabled||!finePointer.matches) return;
    const rect=studioWorld.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)*2-1));
    const y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)*2-1));
    const lookScale=12/Math.max(1,Math.hypot(x,y));
    worldMotion.targetX=x*18; worldMotion.targetY=y*12; worldMotion.targetTurn=x*3;
    worldMotion.targetLookX=x*lookScale; worldMotion.targetLookY=y*lookScale;
  },{passive:true});
  studioWorld?.addEventListener('pointerleave',()=>{
    worldMotion.targetX=0; worldMotion.targetY=0; worldMotion.targetTurn=0;
    worldMotion.targetLookX=0; worldMotion.targetLookY=0;
  });
  finePointer.addEventListener('change',()=>{
    if(!finePointer.matches) { updateStage(true); updateWorld(true); resetCardGlows(); pointer.active=false; }
  });
  root.addEventListener('pointerleave',()=>{ pointer.active=false; });
  document.querySelectorAll('.app-art').forEach(card=>{
    card.addEventListener('pointermove',event=>{
      if(!enabled||!finePointer.matches) return;
      const rect=card.getBoundingClientRect();
      card.style.setProperty('--tilt-x',`${(.5-(event.clientY-rect.top)/rect.height)*6}deg`);
      card.style.setProperty('--tilt-y',`${((event.clientX-rect.left)/rect.width-.5)*6}deg`);
    });
    card.addEventListener('pointerleave',()=>{ card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y'); });
  });
  document.querySelectorAll('.magnetic').forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if(!enabled||!finePointer.matches) return;
      const rect=button.getBoundingClientRect();
      button.style.translate=`${(event.clientX-rect.left-rect.width/2)*.13}px ${(event.clientY-rect.top-rect.height/2)*.2}px`;
    });
    button.addEventListener('pointerleave',()=>button.style.removeProperty('translate'));
  });
  addEventListener('scroll',queueScroll,{passive:true});
  if('ResizeObserver' in window) new ResizeObserver(()=>{
    heroHeight=hero?.offsetHeight || height;
    sizeStage();
    queueScroll();
  }).observe(document.querySelector('main'));
  addEventListener('resize',()=>{sizeScene();queueScroll();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) { cancelAnimationFrame(frame);frame=0; }
    else startLoop();
  });
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){animateIn(entry.target);observer.unobserve(entry.target);}});
    },{threshold:.08});
    document.querySelectorAll('.collection-note,.principles article,.contact-form,.about-meta').forEach(element=>observer.observe(element));
  }
  sizeScene(); updateMotion();
  selectShowcase(activeShowcase, false, false);
  document.querySelectorAll('.title-line,.hero-overline,.hero-bottom,.hero-baseline').forEach((element,index)=>animateIn(element,index*110));
})();
