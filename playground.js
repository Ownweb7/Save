/* Small browser demos inspired by the Android apps. No data leaves this page. */
(() => {
  'use strict';
  const playground = document.querySelector('#playground');
  if (!playground) return;
  const $ = selector => playground.querySelector(selector);
  const all = selector => [...playground.querySelectorAll(selector)];
  const money = amount => '₹' + amount.toLocaleString('en-IN', {maximumFractionDigits: 0});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeDemo = 'save';

  function selectDemo(id, focus = false) {
    const app = window.ODN_APPS.find(item => item.id === id);
    if (!app) return;
    activeDemo = id;
    all('[role="tab"]').forEach(tab => {
      const active = tab.dataset.demo === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    all('.demo-panel').forEach(panel => { panel.hidden = panel.id !== `demo-${id}`; });
    playground.style.setProperty('--demo-accent', app.color);
    const store = $('#demo-store');
    store.href = app.url;
    store.textContent = `${id === 'will' ? 'Find' : 'Get'} ${app.name} on Google Play`;
    const panel = $(`#demo-${id}`);
    if (!reducedMotion.matches && panel.animate) panel.animate([
      {opacity: 0, transform: 'translateY(10px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 260, easing: 'ease-out'});
  }
  all('[role="tab"]').forEach(tab => {
    tab.addEventListener('click', () => selectDemo(tab.dataset.demo));
    tab.addEventListener('keydown', event => {
      const tabs = all('[role="tab"]');
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      selectDemo(tabs[index].dataset.demo, true);
    });
  });
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-try]');
    if (!trigger) return;
    document.querySelector('#app-dialog')?.close('demo');
    selectDemo(trigger.dataset.try, true);
    playground.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
  });

  // Saving goal: integer rupees, an editable plan, and undoable additions.
  let saved = 12500;
  const deposits = [];
  function updateSavings() {
    const target = $('#demo-target');
    const monthly = $('#demo-monthly');
    $('#demo-saved').textContent = money(saved);
    $('#demo-undo').disabled = deposits.length === 0;
    if (!target.checkValidity() || !monthly.checkValidity()) {
      $('#demo-forecast').textContent = 'Enter a whole amount from ₹1 to ₹10,00,00,000 for your goal and monthly saving.';
      $('#demo-remaining').textContent = 'Set your goal below';
      $('.demo-progress').removeAttribute('aria-valuenow');
      $('.demo-progress').setAttribute('aria-valuetext', 'Enter a valid saving goal');
      $('#demo-progress-fill').style.width = '0%';
      return;
    }
    const remaining = Math.max(0, Number(target.value) - saved);
    const percent = Math.min(100, Math.round(saved / Number(target.value) * 100));
    $('#demo-remaining').textContent = remaining ? `${money(remaining)} to go` : 'Goal reached. You did it!';
    $('#demo-progress-fill').style.width = `${percent}%`;
    $('.demo-progress').setAttribute('aria-valuenow', String(percent));
    $('.demo-progress').removeAttribute('aria-valuetext');
    const months = Math.ceil(remaining / Number(monthly.value));
    $('#demo-forecast').textContent = months ? `At ${money(Number(monthly.value))} a month, you’re ${months} ${months === 1 ? 'month' : 'months'} away.` : 'You’ve reached this goal. Set a new target when you’re ready.';
  }
  $('#demo-target').addEventListener('input', updateSavings);
  $('#demo-monthly').addEventListener('input', updateSavings);
  $('#demo-deposit-form').addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number($('#demo-deposit').value);
    if (!$('#demo-deposit').checkValidity() || saved + amount > 1000000000) {
      $('#demo-save-status').textContent = 'Try a smaller amount. This demo supports a total up to ₹1,00,00,00,000.';
      return;
    }
    deposits.push(amount);
    saved += amount;
    updateSavings();
    $('#demo-save-status').textContent = `${money(amount)} added. Every little step counts.`;
    if (!reducedMotion.matches) $('#demo-saved').animate([{transform: 'scale(1.08)'}, {transform: 'scale(1)'}], {duration: 300});
  });
  $('#demo-undo').addEventListener('click', () => {
    if (!deposits.length) return;
    const amount = deposits.pop();
    saved -= amount;
    updateSavings();
    $('#demo-save-status').textContent = `Last addition of ${money(amount)} undone.`;
  });
  $('#demo-save-reset').addEventListener('click', () => {
    saved = 12500;
    deposits.length = 0;
    $('#demo-target').value = '50000';
    $('#demo-monthly').value = '5000';
    $('#demo-deposit').value = '1000';
    updateSavings();
    $('#demo-save-status').textContent = 'Demo reset. Start fresh with the sample goal.';
  });

  // Countdown uses a deadline, so hidden tabs and delayed ticks do not lose time.
  let focusDuration = 60000;
  let focusRemaining = focusDuration;
  let focusDeadline = null;
  function clockText(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function renderFocus() {
    $('#focus-time').textContent = clockText(focusRemaining);
    $('#focus-orbit').style.setProperty('--focus-progress', `${(1 - focusRemaining / focusDuration) * 100}%`);
    $('#focus-orbit').classList.toggle('running', focusDeadline !== null);
  }
  function resetFocus() {
    focusDeadline = null;
    focusRemaining = focusDuration;
    $('#focus-start').textContent = 'Start session';
    $('#focus-phase').textContent = 'Ready when you are';
    renderFocus();
  }
  all('[data-duration]').forEach(button => button.addEventListener('click', () => {
    focusDuration = Number(button.dataset.duration) * 1000;
    resetFocus();
    all('[data-duration]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#focus-status').textContent = `${button.textContent} selected. Ready for a fresh session.`;
  }));
  $('#focus-start').addEventListener('click', () => {
    if (focusDeadline !== null) {
      focusRemaining = Math.max(0, focusDeadline - Date.now());
      focusDeadline = null;
      $('#focus-start').textContent = 'Resume session';
      $('#focus-phase').textContent = 'A little breather';
      $('#focus-status').textContent = 'Session paused.';
    } else {
      if (focusRemaining <= 0) focusRemaining = focusDuration;
      focusDeadline = Date.now() + focusRemaining;
      $('#focus-start').textContent = 'Pause session';
      $('#focus-phase').textContent = 'Be here, together';
      $('#focus-status').textContent = 'Session running. The timer continues if you try another demo.';
    }
    renderFocus();
  });
  $('#focus-reset').addEventListener('click', () => {
    resetFocus();
    $('#focus-status').textContent = 'Session reset.';
  });

  // A clearly labelled pause exercise: no native app blocking or orders.
  let impulseDeadline = null;
  function updateEstimate() {
    const cost = $('#impulse-cost');
    const count = $('#impulse-count');
    $('#impulse-total').textContent = cost.checkValidity() && count.checkValidity() ? money(Number(cost.value) * Number(count.value) * 52) : 'Enter valid amounts';
  }
  $('#impulse-cost').addEventListener('input', updateEstimate);
  $('#impulse-count').addEventListener('input', updateEstimate);
  $('#impulse-start').addEventListener('click', () => {
    impulseDeadline = Date.now() + 5000;
    $('#impulse-pause').hidden = false;
    $('#impulse-start').hidden = true;
    $('#impulse-countdown').textContent = '5';
    $('#impulse-skip').disabled = true;
    $('#impulse-continue').disabled = true;
    $('#impulse-status').textContent = 'Five seconds to check in with yourself. Your choices unlock after the pause.';
  });
  function finishPause(skipped) {
    impulseDeadline = null;
    $('#impulse-pause').hidden = true;
    $('#impulse-start').hidden = false;
    $('#impulse-start').textContent = 'Try the pause again';
    $('#impulse-start').focus();
    $('#impulse-status').textContent = skipped ? 'You chose to skip. A small, intentional decision. No real order was changed.' : 'You took a moment and chose deliberately. This demo does not place an order.';
  }
  $('#impulse-skip').addEventListener('click', () => finishPause(true));
  $('#impulse-continue').addEventListener('click', () => finishPause(false));

  // Four-operation calculator. No eval, dynamic code, or external requests.
  let entry = '0';
  let accumulator = null;
  let operator = null;
  let replaceEntry = false;
  let expression = 'Ready to calculate';
  const symbols = {'+': '+', '−': '−', '×': '×', '÷': '÷'};
  function renderCalc() {
    $('#calc-result').textContent = entry;
    $('#calc-expression').textContent = expression;
  }
  function clearCalc() {
    entry = '0'; accumulator = null; operator = null; replaceEntry = false; expression = 'Ready to calculate';
  }
  function calculate(left, right, op) {
    if (op === '÷' && right === 0) return null;
    const value = op === '+' ? left + right : op === '−' ? left - right : op === '×' ? left * right : left / right;
    return Number.isFinite(value) ? Number(value.toPrecision(12)) : null;
  }
  function calcKey(key) {
    if (entry === 'Error' && key !== 'AC') clearCalc();
    if (/^\d$/.test(key)) {
      if (replaceEntry) { entry = key; replaceEntry = false; }
      else if (entry.replace(/\D/g, '').length < 12) entry = entry === '0' ? key : entry + key;
    } else if (key === '.') {
      if (replaceEntry) { entry = '0.'; replaceEntry = false; }
      else if (!entry.includes('.')) entry += '.';
    } else if (key === 'AC') clearCalc();
    else if (key === '⌫') {
      if (replaceEntry) { entry = '0'; replaceEntry = false; }
      else entry = entry.length > 1 ? entry.slice(0, -1) : '0';
      if (entry === '-') entry = '0';
    } else if (key === '±') entry = String(-Number(entry));
    else if (key === '%') entry = String(Number((Number(entry) / 100).toPrecision(12)));
    else if (symbols[key]) {
      if (operator && !replaceEntry) {
        const result = calculate(accumulator, Number(entry), operator);
        if (result === null) { entry = 'Error'; expression = 'Cannot divide by zero or exceed the number range.'; operator = null; renderCalc(); return; }
        entry = String(result);
      }
      accumulator = Number(entry);
      operator = key;
      replaceEntry = true;
      expression = `${entry} ${key}`;
    } else if (key === '=' && operator && !replaceEntry) {
      const result = calculate(accumulator, Number(entry), operator);
      expression = result === null ? 'Cannot divide by zero or exceed the number range.' : `${accumulator} ${operator} ${entry} =`;
      entry = result === null ? 'Error' : String(result);
      accumulator = null;
      operator = null;
      replaceEntry = true;
    }
    renderCalc();
  }
  all('[data-calc]').forEach(button => button.addEventListener('click', () => calcKey(button.dataset.calc)));
  $('#demo-glow').addEventListener('keydown', event => {
    if (event.target.closest('[role="tablist"]') || event.altKey || event.ctrlKey || event.metaKey) return;
    // Let Enter activate focused controls; operators/digits work throughout the panel.
    if (event.key === 'Enter' && event.target.tagName === 'BUTTON') return;
    const mapped = {'*': '×', '/': '÷', '-': '−', 'Enter': '=', 'Backspace': '⌫', 'Escape': 'AC'};
    const key = mapped[event.key] || event.key;
    if (/^\d$/.test(key) || ['+', '−', '×', '÷', '=', '.', '%', '⌫', 'AC'].includes(key)) {
      event.preventDefault();
      calcKey(key);
      const button = all('[data-calc]').find(item => item.dataset.calc === key);
      if (button && !reducedMotion.matches) button.animate([{backgroundColor: '#c5a2ff55'}, {backgroundColor: '#ffffff08'}], {duration: 200});
    }
  });
  all('[data-neon]').forEach(button => button.addEventListener('click', () => {
    $('#calculator').style.setProperty('--neon', button.dataset.neon);
    all('[data-neon]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));

  // Stopwatch accumulates elapsed time across pauses without relying on tick counts.
  let stopwatchElapsed = 0;
  let stopwatchStart = null;
  let lapCount = 0;
  function stopwatchNow() { return stopwatchElapsed + (stopwatchStart === null ? 0 : Date.now() - stopwatchStart); }
  function stopwatchText(milliseconds) {
    const hundredths = Math.floor(milliseconds / 10);
    return `${String(Math.floor(hundredths / 6000)).padStart(2, '0')}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
  }
  function renderStopwatch() {
    const [whole, fraction] = stopwatchText(stopwatchNow()).split('.');
    $('#stopwatch-time').replaceChildren(document.createTextNode(whole));
    const decimals = document.createElement('span');
    decimals.textContent = '.' + fraction;
    $('#stopwatch-time').append(decimals);
    $('#stopwatch-lap').disabled = stopwatchStart === null;
  }
  $('#stopwatch-start').addEventListener('click', () => {
    if (stopwatchStart === null) {
      stopwatchStart = Date.now();
      $('#stopwatch-start').textContent = 'Pause';
      $('#stopwatch-state').textContent = 'Running';
      $('#stopwatch-status').textContent = 'Stopwatch started. Record a lap whenever you like.';
    } else {
      stopwatchElapsed = stopwatchNow();
      stopwatchStart = null;
      $('#stopwatch-start').textContent = 'Resume';
      $('#stopwatch-state').textContent = 'Paused';
      $('#stopwatch-status').textContent = 'Stopwatch paused.';
    }
    renderStopwatch();
  });
  $('#stopwatch-lap').addEventListener('click', () => {
    if (stopwatchStart === null) return;
    const time = stopwatchText(stopwatchNow());
    const lap = document.createElement('li');
    const number = document.createElement('span');
    number.textContent = String(++lapCount).padStart(2, '0');
    const elapsed = document.createElement('span');
    elapsed.textContent = time;
    lap.append(number, elapsed);
    $('#stopwatch-laps').prepend(lap);
    $('#lap-empty').hidden = true;
    $('#stopwatch-status').textContent = `Lap ${lapCount} recorded at ${time}.`;
    // Keep the browser demo bounded for very long sessions.
    if ($('#stopwatch-laps').children.length > 50) $('#stopwatch-laps').lastElementChild.remove();
  });
  $('#stopwatch-reset').addEventListener('click', () => {
    stopwatchStart = null; stopwatchElapsed = 0; lapCount = 0;
    $('#stopwatch-start').textContent = 'Start';
    $('#stopwatch-state').textContent = 'Ready';
    $('#stopwatch-laps').replaceChildren();
    $('#lap-empty').hidden = false;
    $('#stopwatch-status').textContent = 'Stopwatch and laps reset.';
    renderStopwatch();
  });

  function tick() {
    if (focusDeadline !== null) {
      focusRemaining = Math.max(0, focusDeadline - Date.now());
      if (focusRemaining === 0) {
        focusDeadline = null;
        $('#focus-start').textContent = 'Start again';
        $('#focus-phase').textContent = 'A moment well spent';
        $('#focus-status').textContent = 'Session complete. Thanks for making a little time.';
      }
      renderFocus();
    }
    if (impulseDeadline !== null) {
      const seconds = Math.max(0, Math.ceil((impulseDeadline - Date.now()) / 1000));
      $('#impulse-countdown').textContent = seconds === 0 ? 'Your choice.' : String(seconds);
      if (seconds === 0) {
        impulseDeadline = null;
        $('#impulse-skip').disabled = false;
        $('#impulse-continue').disabled = false;
        $('#impulse-status').textContent = 'Pause complete. Skip the order, or decide you still want it.';
      }
    }
    if (stopwatchStart !== null && activeDemo === 'clock') renderStopwatch();
  }
  window.setInterval(tick, 50);
  document.addEventListener('visibilitychange', tick);
  renderFocus();
})();
