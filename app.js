'use strict';

/* ===================================================================
   RINIX AGENCY — APP.JS
   Modular, dependency-free behavior layer.
   =================================================================== */

/* ---------- Portfolio data ----------
   Structured so new projects can be added without touching HTML. */
const portfolioProjects = [
  {
    title: 'GhostLine',
    description: 'Real-time messaging platform built for anonymous, ephemeral conversation with end-to-end encrypted rooms.',
    category: 'Messaging Platform',
    tags: ['Real-Time', 'WebRTC', 'PWA'],
    image: 'ghostline-chat.png',
    url: 'https://ghostline.rinix.online'
  },
  {
    title: 'Amrutam Water',
    description: 'E-commerce storefront for a wellness water brand, designed around trust, clarity, and fast checkout.',
    category: 'E-Commerce',
    tags: ['E-Commerce', 'Branding', 'Responsive'],
    image: 'amrutam-water.png',
    url: 'https://amrutam-water.netlify.app'
  },
  {
    title: 'Rinix Store',
    description: 'A curated collection of our latest web applications and tools, all in one accessible place.',
    category: 'App Distribution',
    tags: ['Storefront', 'Applications','WebSites'],
    image: 'rs-appstore.png', // Ensure this image exists in your folder
    url: 'https://store.rinix.online'
  },
  {
    title: 'RS Browser',
    description: 'A custom lightweight browser build focused on speed and a minimal, distraction-free interface.',
    category: 'Product Engineering',
    tags: ['Product', 'Performance'],
    image: 'rs-browser.png',
    url: 'https://rs-browser.netlify.app'
  }
];

/* ---------- Portfolio rendering ---------- */
function renderPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  const markup = portfolioProjects.map((project) => `
    <article class="card portfolio-card reveal">
      <div class="portfolio-thumb">
        <img src="${project.image}" alt="${project.title} — ${project.category} preview" loading="lazy" width="1200" height="750">
      </div>
      <div class="portfolio-body">
        <p class="portfolio-category">${project.category}</p>
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <div class="portfolio-tags">
          ${project.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <a class="portfolio-link" href="${project.url}" aria-label="View ${project.title} project">
          View project
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </article>
  `).join('');

  grid.innerHTML = markup;
  observeReveal(grid.querySelectorAll('.reveal'));
}

/* ---------- Sticky header shadow ---------- */
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- Mobile nav toggle ---------- */
function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
  };

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

/* ---------- Scroll-triggered reveal ---------- */
let revealObserver;
function observeReveal(nodeList) {
  if (!('IntersectionObserver' in window)) {
    nodeList.forEach((el) => el.classList.add('in-view'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  }
  nodeList.forEach((el) => revealObserver.observe(el));
}

function initReveal() {
  observeReveal(document.querySelectorAll('.reveal'));
}

/* ---------- Contact form validation & Netlify setup ---------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('formStatus');

  // ... validators same rahenge ...

  function validateField(field) {
    // ... same validation ...
  }

  form.querySelectorAll('input, select, textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
  });

  form.addEventListener('submit', (e) => {
    const fields = Array.from(form.querySelectorAll('input, select, textarea'));
    const allValid = fields.map(validateField).every(Boolean);

    if (!allValid) {
      e.preventDefault();
      status.textContent = 'Please fix the highlighted fields and try again.';
      status.className = 'form-status error';
      return;
    }

    // Show sending state
    status.textContent = 'Sending your message...';
    status.className = 'form-status success';

    // Form submit hone ke baad Netlify handle karega
    // Success ke liye humein redirect set karna hoga (optional)
    // Ya hum Netlify ke success page par redirect kar sakte hain
  });

  // Optional: Netlify success redirection ke liye
  // Agar aap chahte hain ki form submit hone ke baad user kisi success page par jaye
  // toh form mein action="/success.html" daal sakte hain
}

/* ---------- PWA install prompt ---------- */
/* ---------- PWA install prompt ---------- */
function initInstallPrompt() {
  const toast = document.getElementById('installToast');
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('installDismiss');
  if (!toast || !installBtn || !dismissBtn) return;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Check if user previously dismissed it
    if (!localStorage.getItem('rinix-install-dismissed')) {
      toast.hidden = false;
    }
  });

  // Install Button Click Handler (Ye missing tha)
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Prompt show karein
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // Prompt use ho chuka hai, null kar dein
    deferredPrompt = null;
    toast.hidden = true;
  });

  // Dismiss Button Click Handler
  dismissBtn.addEventListener('click', () => {
    toast.hidden = true;
    localStorage.setItem('rinix-install-dismissed', '1');
  });

  window.addEventListener('appinstalled', () => {
    toast.hidden = true;
    deferredPrompt = null;
  });
}


/* ---------- Footer year ---------- */
function initFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderPortfolio();
  initHeaderScroll();
  initNavToggle();
  initReveal();
  initContactForm();
  initInstallPrompt();
  initFooterYear();
});
