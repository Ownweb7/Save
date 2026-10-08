/* Native scroll drives the illustrated chapters; all destinations are ordinary links. */
(() => {
  'use strict';
  const intro = document.querySelector('.cinematic-intro');
  if (!intro) return;
  const root = document.documentElement;
  const stage = intro.querySelector('.cinema-stage');
  const opening = intro.querySelector('.cinema-opening');
  const eyeNavigation = intro.querySelector('.eye-navigation');
  const eyeImage = intro.querySelector('.eyes-scene img');
  const eyeLinks = [...eyeNavigation.querySelectorAll('.eye-portal')];
  const sceneNumber = document.querySelector('#scene-number');
  const world = document.querySelector('.creative-world');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const clamp = (value, min=0, max=1) => Math.max(min, Math.min(max, value));
  const smooth = value => value * value * (3 - 2 * value);
  let motion = root.dataset.motion !== 'off' && !reduced.matches;
  let pending = 0;
  let pointerX = 0, pointerY = 0;
  let targetX = 0, targetY = 0;
  let pointerFrame = 0;
  let stageVisible = true;
  const cursor = document.createElement('span');
  cursor.className = 'cinema-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);

  function placeEyeLinks() {
    const stageBox = stage.getBoundingClientRect();
    const imageBox = eyeImage.getBoundingClientRect();
    const ratio = 1672 / 941;
    const mobile = matchMedia('(max-width:900px)').matches;
    const renderedWidth = Math.max(imageBox.width, imageBox.height * ratio);
    const renderedHeight = renderedWidth / ratio;
    const startX = imageBox.left - stageBox.left + (imageBox.width - renderedWidth) / 2;
    const startY = imageBox.top - stageBox.top + (imageBox.height - renderedHeight) / 2;
    eyeLinks.forEach((link, index) => {
      const eyeX = mobile ? (index ? .575 : .448) : (index ? .776 : .269);
      const eyeY = mobile ? (index ? .343 : .332) : .442;
      link.style.left = `${clamp(startX + renderedWidth * eyeX, link.offsetWidth / 2 + 10, stageBox.width - link.offsetWidth / 2 - 10)}px`;
      link.style.top = `${startY + renderedHeight * eyeY}px`;
    });
  }

  function renderScroll() {
    pending = 0;
    const box = intro.getBoundingClientRect();
    const travel = Math.max(1, intro.offsetHeight - stage.offsetHeight);
    const progress = motion ? clamp(-box.top / travel) : 0;
    const eyes = smooth(clamp((progress - .25) / .4));
    const openingOpacity = 1 - smooth(clamp(progress / .24));
    stage.style.setProperty('--portrait-opacity', (1 - eyes).toFixed(3));
    stage.style.setProperty('--portrait-scale', (1.02 + progress * .48).toFixed(3));
    stage.style.setProperty('--wing-spread', `${progress * 125}px`);
    stage.style.setProperty('--wing-turn', `${progress * 7}deg`);
    stage.style.setProperty('--eyes-opacity', eyes.toFixed(3));
    stage.style.setProperty('--eyes-scale', (1.15 - eyes * .15).toFixed(3));
    stage.style.setProperty('--opening-opacity', openingOpacity.toFixed(3));
    stage.style.setProperty('--opening-lift', `${-progress * 80}px`);
    stage.style.setProperty('--eyes-links-opacity', smooth(clamp((progress - .58) / .17)).toFixed(3));
    const eyesActive = motion && progress > .64;
    eyeNavigation.classList.toggle('is-active', eyesActive);
    eyeNavigation.inert = !eyesActive;
    opening.inert = openingOpacity < .15;
    sceneNumber.textContent = progress > .4 ? '02' : '01';
    placeEyeLinks();
    if (world) {
      const worldBox = world.getBoundingClientRect();
      const inView = clamp((innerHeight - worldBox.top) / (innerHeight + worldBox.height));
      world.style.setProperty('--portal-drift', `${motion ? (inView - .5) * 60 : 0}px`);
      world.style.setProperty('--portal-scale', String(motion ? .88 + inView * .2 : 1));
    }
  }
  function queueScroll() {
    if (!pending) pending = requestAnimationFrame(renderScroll);
  }
  function renderPointer() {
    pointerFrame = 0;
    if (!motion || document.hidden || !stageVisible) return;
    pointerX += (targetX - pointerX) * .1;
    pointerY += (targetY - pointerY) * .1;
    stage.style.setProperty('--portrait-x', `${pointerX.toFixed(2)}px`);
    stage.style.setProperty('--portrait-y', `${pointerY.toFixed(2)}px`);
    placeEyeLinks();
    if (Math.abs(targetX - pointerX) + Math.abs(targetY - pointerY) > .03) {
      pointerFrame = requestAnimationFrame(renderPointer);
    }
  }
  function resetPointer() {
    targetX = targetY = pointerX = pointerY = 0;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    ['--portrait-x', '--portrait-y'].forEach(key => stage.style.removeProperty(key));
    cursor.classList.remove('is-visible');
  }
  function updateMotion() {
    motion = root.dataset.motion !== 'off' && !reduced.matches;
    if (!motion) resetPointer();
    queueScroll();
  }
  stage.addEventListener('pointermove', event => {
    if (!motion || !finePointer.matches) return;
    const box = stage.getBoundingClientRect();
    targetX = (event.clientX / Math.max(1, box.width) - .5) * -18;
    targetY = ((event.clientY - box.top) / Math.max(1, box.height) - .5) * -12;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(renderPointer);
  }, {passive:true});
  stage.addEventListener('pointerleave', () => {
    targetX = targetY = 0;
    if (motion && !pointerFrame) pointerFrame = requestAnimationFrame(renderPointer);
  });
  // The ordinary pointer stays visible, with a decorative ring following it.
  document.addEventListener('pointermove', event => {
    if (!motion || !finePointer.matches) return;
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    cursor.classList.add('is-visible');
    cursor.classList.toggle('is-link', Boolean(event.target.closest('a,button,summary')));
  }, {passive:true});
  root.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  finePointer.addEventListener('change', resetPointer);
  new MutationObserver(updateMotion).observe(root, {attributes:true, attributeFilter:['data-motion']});
  reduced.addEventListener('change', updateMotion);
  addEventListener('scroll', queueScroll, {passive:true});
  addEventListener('resize', queueScroll, {passive:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetPointer(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      stageVisible = entries[0].isIntersecting;
      if (!stageVisible) resetPointer();
    }).observe(intro);
  }
  root.classList.add('cinema-ready');
  renderScroll();

  // A soft, locally synthesized soundscape starts only after an explicit click.
  const sound = document.querySelector('#sound-toggle');
  if (sound && (window.AudioContext || window.webkitAudioContext)) sound.hidden = false;
  let audioContext, master, soundEnabled = false, soundBusy = false;
  function createSoundscape() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Audio unavailable');
    audioContext = new AudioContext();
    master = audioContext.createGain();
    master.gain.value = 0;
    master.connect(audioContext.destination);
    [110, 164.81, 220.2].forEach((frequency, index) => {
      const voice = audioContext.createOscillator();
      const gain = audioContext.createGain();
      voice.type = 'sine';
      voice.frequency.value = frequency;
      gain.gain.value = .026 / (index + 1);
      voice.connect(gain).connect(master);
      voice.start();
    });
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const wind = audioContext.createBufferSource();
    wind.buffer = buffer; wind.loop = true;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 320;
    const windGain = audioContext.createGain(); windGain.gain.value = .017;
    wind.connect(filter).connect(windGain).connect(master); wind.start();
  }
  sound?.addEventListener('click', async () => {
    if (soundBusy) return;
    soundBusy = true;
    try {
      if (!audioContext) createSoundscape();
      const next = !soundEnabled;
      if (next) await audioContext.resume();
      soundEnabled = next;
      master.gain.cancelScheduledValues(audioContext.currentTime);
      master.gain.setTargetAtTime(next ? .65 : 0, audioContext.currentTime, .25);
      sound.setAttribute('aria-pressed', String(next));
      sound.textContent = next ? 'Sound on' : 'Sound off';
      sound.setAttribute('aria-label', next ? 'Mute ambient sound' : 'Play ambient sound');
    } catch {
      sound.textContent = 'Sound unavailable'; sound.disabled = true;
    } finally { soundBusy = false; }
  });
  document.addEventListener('visibilitychange', () => {
    if (!audioContext) return;
    if (document.hidden) audioContext.suspend().catch(() => {});
    else if (soundEnabled) audioContext.resume().catch(() => {});
  });
  addEventListener('pagehide', () => audioContext?.suspend().catch(() => {}));
  addEventListener('pageshow', () => { if (soundEnabled && !document.hidden) audioContext?.resume().catch(() => {}); });
})();
