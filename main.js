// Mobile nav toggle
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");
if (menuBtn) {
  menuBtn.addEventListener("click", () => navLinks.classList.toggle("open"));
}

// Scroll reveal — progressive enhancement.
// Content must NEVER stay hidden if the observer can't run, so we have fallbacks.
const revealEls = document.querySelectorAll(".reveal");
const showAll = () => revealEls.forEach((el) => el.classList.add("in"));

if (revealEls.length) {
  if (!("IntersectionObserver" in window)) {
    showAll();
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
    // Failsafe: if anything is still hidden shortly after load, reveal it.
    window.addEventListener("load", () => setTimeout(showAll, 1200));
  }
}

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Copy email address to clipboard
const copyBtn = document.getElementById("copyEmail");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const email = copyBtn.dataset.email;
    const label = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(email);
    } catch (e) {
      // Fallback for older / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    copyBtn.textContent = "Copied ✓";
    setTimeout(() => (copyBtn.textContent = label), 1800);
  });
}
