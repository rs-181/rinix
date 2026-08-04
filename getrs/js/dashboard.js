import { auth, db, SITE_ORIGIN } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, query, where, getDocs,
  doc, deleteDoc, updateDoc, runTransaction, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { requireAuth, slugify, showError, hideError } from "./app.js";

const user = await requireAuth();
if (!user) throw new Error("redirecting to login");

document.getElementById("user-email").textContent = user.email || "";
document.getElementById("user-email").classList.remove("hidden");

document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

const grid = document.getElementById("sites-grid");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("empty-state");
const createBtn = document.getElementById("create-btn");
const emptyCreateBtn = document.getElementById("empty-create-btn");
const createError = document.getElementById("create-error");
const siteCount = document.getElementById("site-count");

let sites = [];

async function loadSites() {
  loading.classList.remove("hidden");
  emptyState.classList.add("hidden");
  createBtn.classList.add("hidden");
  grid.innerHTML = "";

  const q = query(collection(db, "sites"), where("ownerId", "==", user.uid));
  const snap = await getDocs(q);
  sites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  loading.classList.add("hidden");
  siteCount.textContent = `${sites.length} ${sites.length === 1 ? "site" : "sites"}`;

  if (sites.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    return;
  }

  createBtn.classList.remove("hidden");
  sites.forEach((site, i) => grid.appendChild(renderSiteCard(site, i)));
}

function renderSiteCard(site, index) {
  const wrap = document.createElement("div");
  wrap.className = "h-full animate-fade-slide-up";
  wrap.style.animationDelay = `${Math.min(index, 8) * 40}ms`;

  const pageCount = site.pages?.length ?? 1;
  const card = document.createElement("div");
  card.className = "card group flex h-full flex-col justify-between p-5 transition hover:shadow-lg";

  const top = document.createElement("div");

  const titleRow = document.createElement("div");
  titleRow.className = "mb-3 flex items-start justify-between gap-2";
  const title = document.createElement("h3");
  title.className = "text-base font-semibold text-white";
  title.textContent = site.name;
  titleRow.appendChild(title);

  const badges = document.createElement("div");
  badges.className = "flex shrink-0 gap-1";
  if (site.isSuspended) {
    const b = document.createElement("span");
    b.title = "Suspended by an admin";
    b.className = "flex h-6 w-6 items-center justify-center rounded-full bg-red-400/10 text-red-400";
    b.textContent = "⚠";
    badges.appendChild(b);
  }
  if (site.isPasswordProtected) {
    const b = document.createElement("span");
    b.title = "Password protected";
    b.className = "flex h-6 w-6 items-center justify-center rounded-full bg-charcoal-800 text-gold-500";
    b.textContent = "🔒";
    badges.appendChild(b);
  }
  titleRow.appendChild(badges);
  top.appendChild(titleRow);

  const link = document.createElement("a");
  link.href = `${SITE_ORIGIN}/sites/${site.sitename}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "truncate text-sm text-electric-400 hover:underline block";
  link.textContent = `/sites/${site.sitename}`;
  top.appendChild(link);

  const pageInfo = document.createElement("p");
  pageInfo.className = "mt-1 text-xs text-charcoal-300";
  pageInfo.textContent = `${pageCount} ${pageCount === 1 ? "page" : "pages"}`;
  top.appendChild(pageInfo);

  card.appendChild(top);

  const actions = document.createElement("div");
  actions.className = "mt-5 flex gap-2";

  const editBtn = document.createElement("a");
  editBtn.href = `builder.html?site=${encodeURIComponent(site.id)}`;
  editBtn.className = "btn-primary flex-1 text-sm text-center";
  editBtn.textContent = "Edit";
  actions.appendChild(editBtn);

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "btn-secondary text-sm";
  settingsBtn.title = "Site settings";
  settingsBtn.textContent = "⚙";
  settingsBtn.addEventListener("click", () => openSettingsModal(site));
  actions.appendChild(settingsBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-secondary text-sm text-red-400";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => handleDelete(site));
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  wrap.appendChild(card);
  return wrap;
}

async function handleCreate() {
  const name = window.prompt("Name your new site:");
  if (!name || !name.trim()) return;

  hideError(createError);
  createBtn.disabled = true;

  const desired = slugify(name) || "site";
  let finalSlug = desired;
  let created = false;

  // Using the sitename itself as the Firestore document ID lets this
  // transaction atomically check-and-claim it — no separate uniqueness
  // check that could race with another user creating the same name at
  // the same moment.
  for (let attempt = 1; attempt <= 50 && !created; attempt++) {
    finalSlug = attempt === 1 ? desired : `${desired}-${attempt}`;
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, "sites", finalSlug);
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error("taken");
        tx.set(ref, {
          name: name.trim(),
          sitename: finalSlug,
          ownerId: user.uid,
          isPasswordProtected: false,
          isSuspended: false,
          theme: { backgroundColor: "", backgroundImageUrl: "" },
          footer: { socialLinks: [] },
          pages: [{ id: "home", name: "Home", slug: "home", blocks: [] }],
          createdAt: serverTimestamp(),
        });
      });
      created = true;
    } catch {
      // slug taken — loop tries the next numbered suffix
    }
  }

  createBtn.disabled = false;

  if (!created) {
    showError(createError, "Couldn't find an available name — try something more specific.");
    return;
  }

  if (finalSlug !== desired) {
    window.alert(`"${desired}" was already taken, so your site is published at /sites/${finalSlug} instead.`);
  }

  await loadSites();
}

async function handleDelete(site) {
  const confirmed = window.confirm(`Delete "${site.name}"? This can't be undone.`);
  if (!confirmed) return;
  await deleteDoc(doc(db, "sites", site.id));
  await loadSites();
}

// ---------- Settings modal ----------
const modal = document.getElementById("settings-modal");
const protectedCheckbox = document.getElementById("settings-protected");
const passwordFields = document.getElementById("settings-password-fields");
const passwordInput = document.getElementById("settings-password");
const confirmInput = document.getElementById("settings-confirm");
const passwordLabel = document.getElementById("settings-password-label");
const settingsError = document.getElementById("settings-error");
const settingsSiteName = document.getElementById("settings-site-name");

let activeSite = null;

function openSettingsModal(site) {
  activeSite = site;
  settingsSiteName.textContent = site.name;
  protectedCheckbox.checked = !!site.isPasswordProtected;
  passwordInput.value = "";
  confirmInput.value = "";
  passwordLabel.textContent = site.isPasswordProtected ? "New password (leave blank to keep current)" : "Password";
  passwordFields.classList.toggle("hidden", !protectedCheckbox.checked);
  hideError(settingsError);
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

protectedCheckbox.addEventListener("change", () => {
  passwordFields.classList.toggle("hidden", !protectedCheckbox.checked);
});

document.getElementById("settings-cancel").addEventListener("click", () => {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
});

document.getElementById("settings-save").addEventListener("click", async () => {
  hideError(settingsError);
  const enabled = protectedCheckbox.checked;
  const settingNewPassword = enabled && (passwordInput.value.length > 0 || !activeSite.isPasswordProtected);

  if (settingNewPassword) {
    if (passwordInput.value.length < 4) {
      showError(settingsError, "Password must be at least 4 characters.");
      return;
    }
    if (passwordInput.value !== confirmInput.value) {
      showError(settingsError, "Passwords don't match.");
      return;
    }
  }

  const saveBtn = document.getElementById("settings-save");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    const updates = { isPasswordProtected: enabled };
    if (enabled) {
      if (passwordInput.value.length > 0) {
        // bcryptjs, loaded globally via CDN <script> on this page.
        updates.passwordHash = window.dcodeIO.bcrypt.hashSync(passwordInput.value, 10);
      }
    } else {
      updates.passwordHash = null;
    }
    await updateDoc(doc(db, "sites", activeSite.id), updates);
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    await loadSites();
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});

createBtn.addEventListener("click", handleCreate);
emptyCreateBtn.addEventListener("click", handleCreate);

loadSites();
