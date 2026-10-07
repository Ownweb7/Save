(() => {
  'use strict';
  const menu = document.querySelector('.menu-btn');
  const navigation = document.querySelector('.nav-links');
  const closeMenu = () => {
    navigation?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Open navigation');
  };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  navigation?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  document.querySelectorAll('#year').forEach(el => { el.textContent = new Date().getFullYear(); });

  let toastTimer;
  function notify(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }
  document.querySelector('#copyEmail')?.addEventListener('click', async event => {
    const email = event.currentTarget.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      notify('Email address copied.');
    } catch {
      const input = document.createElement('textarea');
      input.value = email;
      input.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.append(input);
      input.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Manual copy remains available. */ }
      input.remove();
      document.querySelector('#copyEmail').focus();
      notify(copied ? 'Email address copied.' : 'Please select and copy the email address above.');
    }
  });

  const savings = document.querySelector('#savings-range');
  savings?.addEventListener('input', () => {
    const amount = Number(savings.value);
    const percent = Math.round(amount / 500);
    document.querySelector('#saved-amount').textContent = '₹' + amount.toLocaleString('en-IN');
    document.querySelector('#goal-percent').textContent = percent === 100 ? 'Goal reached. You did it!' : `${percent}% of the way there`;
    document.querySelector('#savings-ring').style.setProperty('--progress', `${percent}%`);
    savings.setAttribute('aria-valuetext', `${amount.toLocaleString('en-IN')} rupees saved, ${percent} percent of goal`);
  });

  const filters = document.querySelectorAll('[data-filter]');
  filters.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    filters.forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    document.querySelectorAll('.app-card').forEach(card => {
      card.hidden = selected !== 'All' && card.dataset.category !== selected;
      if (!card.hidden) count++;
    });
    document.querySelector('.collection-note').hidden = selected !== 'All';
    document.querySelector('#collection-count').textContent = selected === 'All' ? 'Showing all 5 apps' : `${count} ${selected.toLowerCase()} ${count === 1 ? 'app' : 'apps'}`;
  }));

  const dialog = document.querySelector('#app-dialog');
  let dialogTrigger;
  document.querySelectorAll('[data-app]').forEach(button => button.addEventListener('click', () => {
    const app = window.ODN_APPS.find(item => item.id === button.dataset.app);
    if (!app || !dialog) return;
    dialogTrigger = button;
    // All values below come from the repository's app catalog, never user input.
    document.querySelector('#dialog-content').innerHTML = `
      <img class="dialog-icon" src="icons/${encodeURIComponent(app.icon)}" alt="${app.name} icon">
      <span class="dialog-category">${app.category} · Android</span>
      <h2 class="dialog-title" id="dialog-title">${app.name}</h2>
      <p class="dialog-description">${app.desc}</p>
      <ul class="dialog-features">${app.features.map(feature => `<li>${feature}</li>`).join('')}</ul>
      <div class="dialog-actions"><a class="btn btn-gold" href="${app.url}" target="_blank" rel="noopener">${app.id === 'will' ? 'Find on Google Play' : 'Get it on Google Play'} <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></a><a href="${app.policy}">Read privacy policy</a></div>
      <p class="dialog-note">By ODN &amp; Sons · Made with care in Hisar, India</p>`;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }));
  dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]), a[href]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog?.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    dialogTrigger?.focus();
  });

  document.querySelector('#policy-select')?.addEventListener('change', event => {
    const allowed = ['privacy-policies.html', ...window.ODN_APPS.map(app => app.policy)];
    if (allowed.includes(event.target.value)) window.location.href = event.target.value;
  });
  const sections = document.querySelectorAll('.content h2[id]');
  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) document.querySelectorAll('.document-nav nav a').forEach(link => {
          const active = link.hash === `#${entry.target.id}`;
          link.classList.toggle('current', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, {rootMargin: '-100px 0px -65% 0px'});
    sections.forEach(section => observer.observe(section));
  }

  const form = document.querySelector('#contact-form');
  function emailContent() {
    return {
      subject: `${document.querySelector('#contact-app').value} — ${document.querySelector('#contact-topic').value}`,
      body: document.querySelector('#contact-message').value.trim()
    };
  }
  form?.addEventListener('input', () => {
    const {subject, body} = emailContent();
    document.querySelector('#gmail-link').href = `https://mail.google.com/mail/?view=cm&fs=1&to=support%40allcreatormind.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const {subject, body} = emailContent();
    if (!body) {
      document.querySelector('#contact-message').setCustomValidity('Please write a message.');
      document.querySelector('#contact-message').reportValidity();
      return;
    }
    document.querySelector('#contact-status').textContent = 'Continue in your email app to send. If it didn’t open, use the Gmail link below or copy our email address.';
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:support@allcreatormind.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    emailLink.target = '_blank';
    emailLink.rel = 'noopener';
    document.body.append(emailLink);
    emailLink.click();
    emailLink.remove();
  });
  document.querySelector('#contact-message')?.addEventListener('input', event => event.target.setCustomValidity(''));
})();
