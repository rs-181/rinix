import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { renderBlock, SOCIAL_PLATFORMS } from "./app.js";

const loading = document.getElementById("loading");
const root = document.getElementById("app-root");

function parseLocation() {
  // Query-string form (?sitename=x&page=y) works without any server
  // rewrite, useful for opening site.html directly during local testing.
  const params = new URLSearchParams(window.location.search);
  if (params.get("sitename")) {
    return { sitename: params.get("sitename"), pageSlug: params.get("page") || null };
  }
  // Path form (/sites/x/y) is what vercel.json's rewrite actually routes
  // here with in production — see vercel.json.
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("sites");
  if (idx === -1 || !parts[idx + 1]) return null;
  return { sitename: decodeURIComponent(parts[idx + 1]), pageSlug: parts[idx + 2] ? decodeURIComponent(parts[idx + 2]) : null };
}

function showMessage(title, body) {
  loading.classList.add("hidden");
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "flex min-h-screen items-center justify-center bg-charcoal-950 px-6 text-center text-white";
  wrap.innerHTML = `
    <div class="card w-full max-w-sm p-8">
      <h1 class="mb-1 font-display text-xl font-bold"></h1>
      <p class="text-sm text-charcoal-300"></p>
    </div>`;
  wrap.querySelector("h1").textContent = title;
  wrap.querySelector("p").textContent = body;
  root.appendChild(wrap);
}

const location_ = parseLocation();
if (!location_) {
  showMessage("Site not found", "This URL doesn't point to a published RS Net site.");
  throw new Error("no sitename in URL");
}

const snap = await getDoc(doc(db, "sites", location_.sitename));
if (!snap.exists()) {
  showMessage("Site not found", "This site doesn't exist or may have been removed.");
  throw new Error("site not found");
}

const site = { id: snap.id, ...snap.data() };
document.title = `${site.name} — RS Net`;

if (site.isSuspended) {
  showMessage("Site unavailable", "This site has been temporarily suspended and isn't available right now.");
  throw new Error("suspended");
}

if (!site.pages || site.pages.length === 0) {
  showMessage("Site not found", "This site doesn't have any pages yet.");
  throw new Error("no pages");
}

const homePageId = site.pages[0].id;
const page = location_.pageSlug
  ? site.pages.find((p) => p.slug === location_.pageSlug || p.id === location_.pageSlug)
  : site.pages[0];

if (!page) {
  showMessage("Page not found", "That page doesn't exist on this site.");
  throw new Error("page not found");
}

// ---------- Password gate ----------
const UNLOCK_KEY = `rsnet_unlock_${site.id}`;

function renderPasswordGate() {
  loading.classList.add("hidden");
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "flex min-h-screen items-center justify-center bg-charcoal-950 px-6 text-white";
  wrap.innerHTML = `
    <div class="card w-full max-w-sm p-8 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-charcoal-800 text-xl">🔒</div>
      <h1 class="mb-1 font-display text-xl font-bold"></h1>
      <p class="mb-6 text-sm text-charcoal-300">Enter the password to view this site.</p>
      <form id="unlock-form" class="space-y-3 text-left">
        <input id="unlock-password" type="password" required class="input" placeholder="Password" autofocus />
        <p id="unlock-error" class="hidden text-sm text-red-400"></p>
        <button type="submit" class="btn-primary w-full">Unlock</button>
      </form>
    </div>`;
  wrap.querySelector("h1").textContent = `${site.name} is locked`;
  root.appendChild(wrap);

  document.getElementById("unlock-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const password = document.getElementById("unlock-password").value;
    const errorEl = document.getElementById("unlock-error");
    // Client-side bcrypt compare — a real security tradeoff versus the
    // server-side version, since a determined visitor could inspect the
    // site doc's passwordHash directly and brute-force it offline with no
    // rate limiting. Reasonable for a free no-code site builder, but worth
    // knowing if these sites ever need to protect something sensitive.
    const matches = window.dcodeIO.bcrypt.compareSync(password, site.passwordHash || "");
    if (!matches) {
      errorEl.textContent = "Incorrect password.";
      errorEl.classList.remove("hidden");
      return;
    }
    sessionStorage.setItem(UNLOCK_KEY, "1");
    renderSite();
  });
}

if (site.isPasswordProtected && site.passwordHash && sessionStorage.getItem(UNLOCK_KEY) !== "1") {
  renderPasswordGate();
} else {
  renderSite();
}

// ---------- Main render ----------
function renderSite() {
  loading.classList.add("hidden");
  root.innerHTML = "";

  const outer = document.createElement("div");
  outer.className = "min-h-screen text-white";
  const theme = site.theme || {};
  if (theme.backgroundColor) outer.style.backgroundColor = theme.backgroundColor;
  if (theme.backgroundImageUrl) {
    outer.style.backgroundImage = `url(${theme.backgroundImageUrl})`;
    outer.style.backgroundSize = "cover";
    outer.style.backgroundPosition = "center";
    outer.style.backgroundAttachment = "fixed";
  }

  const overlay = document.createElement("div");
  overlay.className = theme.backgroundColor || theme.backgroundImageUrl ? "min-h-screen bg-black/30" : "min-h-screen bg-charcoal-950";

  if (site.pages.length > 1) {
    const nav = document.createElement("nav");
    nav.className = "border-b border-white/10";
    const inner = document.createElement("div");
    inner.className = "mx-auto flex max-w-3xl flex-wrap gap-5 px-6 py-4 text-sm";
    site.pages.forEach((p) => {
      const a = document.createElement("a");
      a.href = p.id === homePageId ? `/sites/${site.sitename}` : `/sites/${site.sitename}/${p.slug}`;
      a.className = p.id === page.id ? "text-gold-500" : "text-charcoal-300 hover:text-white";
      a.textContent = p.name;
      inner.appendChild(a);
    });
    nav.appendChild(inner);
    overlay.appendChild(nav);
  }

  const main = document.createElement("main");
  main.className = "mx-auto max-w-3xl space-y-6 px-6 py-14";
  if (page.blocks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-center text-charcoal-300";
    empty.textContent = "This page doesn't have any content yet.";
    main.appendChild(empty);
  } else {
    page.blocks.forEach((block) => main.appendChild(renderBlock(block)));
  }
  overlay.appendChild(main);

  overlay.appendChild(renderFooter(site.footer));

  outer.appendChild(overlay);
  root.appendChild(outer);
}

function renderFooter(footer) {
  const el = document.createElement("footer");
  el.className = "border-t border-white/10 px-6 py-8 text-center text-sm text-charcoal-300";

  const links = (footer?.socialLinks || []).filter((l) => l.url);
  if (links.length > 0) {
    const row = document.createElement("div");
    row.className = "flex justify-center gap-4";
    links.forEach((link) => {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = SOCIAL_PLATFORMS[link.platform]?.label || "";
      a.className = "flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 transition hover:text-gold-500";
      a.textContent = SOCIAL_PLATFORMS[link.platform]?.icon || "🔗";
      row.appendChild(a);
    });
    el.appendChild(row);
  }

  // Mandatory branding — hardcoded here, not read from `site` at all, so
  // there's no data path by which the builder could ever remove it.
  const badge = document.createElement("div");
  badge.className = "mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-charcoal-300";
  badge.innerHTML = `
    <a href="https://getrs.vercel.app" target="_blank" rel="noopener noreferrer" class="hover:text-gold-500">Made with getrs.vercel.app</a>
    <span aria-hidden="true">·</span>
    <a href="https://rs-appstore.blogspot.com" target="_blank" rel="noopener noreferrer" class="hover:text-gold-500">Powered by rs-appstore.blogspot.com</a>
  `;
  el.appendChild(badge);

  return el;
}
