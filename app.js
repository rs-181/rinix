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
    url: 'https://ghostline-chat.netlify.app'
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
    title: 'RS App Store',
    description: 'A curated collection of our latest web applications and tools, all in one accessible place.',
    category: 'App Distribution',
    tags: ['Storefront', 'Applications','WebSites'],
    image: 'rs-appstore.png', // Ensure this image exists in your folder
    url: 'https://rs-appstore.blogspot.com'
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

  const validators = {
    name: (v) => v.trim().length >= 2 || 'Please enter your name.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
    phone: (v) => /^[0-9+\s-]{8,15}$/.test(v.trim()) || 'Please enter a valid mobile number.',
    project: (v) => v.trim().length > 0 || 'Please select a project type.',
    message: (v) => v.trim().length >= 10 || 'Please add a few details about your project (10+ characters).'
  };

  function validateField(field) {
    const row = field.closest('.form-row');
    const errorEl = document.getElementById(`err-${field.name}`);
    const rule = validators[field.name];
    if (!rule) return true;
    const result = rule(field.value);
    if (result === true) {
      row.classList.remove('invalid');
      if (errorEl) errorEl.textContent = '';
      return true;
    }
    row.classList.add('invalid');
    if (errorEl) errorEl.textContent = result;
    return false;
  }

  form.querySelectorAll('input, select, textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
  });

  form.addEventListener('submit', (e) => {
    const fields = Array.from(form.querySelectorAll('input, select, textarea'));
    const allValid = fields.map(validateField).every(Boolean);

    if (!allValid) {
      e.preventDefault(); // Sirf tab roko jab form galat bhara ho
      status.textContent = 'Please fix the highlighted fields and try again.';
      status.className = 'form-status error';
      return;
    }

    // Sab kuch theek hai, Netlify ise background mein capture kar lega
    status.textContent = 'Sending your message...';
    status.className = 'form-status success';
  });
}


/* ---------- PWA install prompt ---------- */
function initInstallPrompt() {
  const toast = document.getElementById('installToast');
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('installDismiss');
  if (!toast || !installBtn || !dismissBtn) return;

  let deferredPrompt = null;

  // app.js mein line 150 ke aas paas
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Yahan sessionStorage ki jagah localStorage karein
  if (!localStorage.getItem('rinix-install-dismissed')) {
    toast.hidden = false;
  }
});

dismissBtn.addEventListener('click', () => {
  toast.hidden = true;
  // Yahan bhi localStorage karein
  localStorage.setItem('rinix-install-dismissed', '1');
});


  window.addEventListener('appinstalled', () => {
    toast.hidden = true;
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
