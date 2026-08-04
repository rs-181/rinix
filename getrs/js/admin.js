import { auth, db, OWNER_EMAIL, SITE_ORIGIN } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// This check decides whether the page's JS shows the dashboard at all —
// but it's purely cosmetic. Even if someone bypassed this (e.g. by
// running admin.js's internals manually from devtools), every Firestore
// call below still goes through firestore.rules' own isAdmin() check,
// which verifies request.auth.token.email server-side. That's the real
// boundary; this is just what makes the page *look* like nothing is here
// to anyone who isn't the owner.
onAuthStateChanged(auth, (user) => {
  if (user && user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    document.getElementById("not-found").classList.add("hidden");
    document.getElementById("admin-root").classList.remove("hidden");
    document.title = "Admin — RS Net";
    renderAdmin();
  }
  // Anyone else: leave the default 404 markup exactly as it was on load.
});

async function renderAdmin() {
  const root = document.getElementById("admin-root");
  root.innerHTML = `
    <header class="border-b border-charcoal-700 bg-charcoal-950/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span class="font-display text-lg font-bold">RS Net <span class="text-gold-500">Admin</span></span>
        <a href="dashboard.html" class="btn-secondary text-sm">← Back to dashboard</a>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="font-display text-xl font-bold">All sites</h1>
        <p id="site-count" class="text-sm text-charcoal-300"></p>
      </div>
      <div id="loading" class="flex justify-center py-20"><div class="spinner"></div></div>
      <div id="table-wrap" class="card hidden overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="border-b border-charcoal-700 text-xs uppercase tracking-wider text-charcoal-300">
            <tr>
              <th class="px-4 py-3 font-medium">Site</th>
              <th class="px-4 py-3 font-medium">Owner</th>
              <th class="px-4 py-3 font-medium">Pages</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody id="sites-tbody"></tbody>
        </table>
      </div>
      <p id="empty-msg" class="card hidden p-8 text-center text-sm text-charcoal-300">No sites on the platform yet.</p>
    </main>

    <div id="edit-modal" class="fixed inset-0 z-20 hidden items-center justify-center bg-black/60 px-4 animate-fade-in">
      <div class="card w-full max-w-sm animate-scale-in p-6">
        <h2 class="mb-4 font-display text-lg font-bold">Edit site</h2>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-sm text-charcoal-300">Site name</label>
            <input id="edit-name" class="input" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-charcoal-300">URL</label>
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-sm text-charcoal-300">/sites/</span>
              <input id="edit-sitename" class="input" />
            </div>
            <p class="mt-1 text-xs text-charcoal-300">Doesn't check for collisions with another site's URL — double-check it's free before saving.</p>
          </div>
        </div>
        <p id="edit-error" class="mt-3 hidden text-sm text-red-400"></p>
        <div class="mt-5 flex gap-2">
          <button id="edit-cancel" class="btn-secondary flex-1 text-sm">Cancel</button>
          <button id="edit-save" class="btn-primary flex-1 text-sm">Save</button>
        </div>
      </div>
    </div>
  `;

  await loadSites();
}

let sites = [];

async function loadSites() {
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("table-wrap").classList.add("hidden");
  document.getElementById("empty-msg").classList.add("hidden");

  const snap = await getDocs(collection(db, "sites"));
  sites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  sites.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

  document.getElementById("loading").classList.add("hidden");
  document.getElementById("site-count").textContent = `${sites.length} ${sites.length === 1 ? "site" : "sites"}`;

  if (sites.length === 0) {
    document.getElementById("empty-msg").classList.remove("hidden");
    return;
  }

  document.getElementById("table-wrap").classList.remove("hidden");
  renderRows();
}

function renderRows() {
  const tbody = document.getElementById("sites-tbody");
  tbody.innerHTML = "";

  sites.forEach((site) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-charcoal-700 last:border-0";

    const siteCell = document.createElement("td");
    siteCell.className = "px-4 py-3";
    const nameEl = document.createElement("p");
    nameEl.className = "font-medium text-white";
    nameEl.textContent = site.name;
    const linkEl = document.createElement("a");
    linkEl.href = `${SITE_ORIGIN}/sites/${site.sitename}`;
    linkEl.target = "_blank";
    linkEl.rel = "noopener noreferrer";
    linkEl.className = "text-xs text-electric-400 hover:underline";
    linkEl.textContent = `/sites/${site.sitename}`;
    siteCell.appendChild(nameEl);
    siteCell.appendChild(linkEl);
    tr.appendChild(siteCell);

    const ownerCell = document.createElement("td");
    ownerCell.className = "px-4 py-3 text-xs text-charcoal-300";
    ownerCell.textContent = site.ownerId;
    tr.appendChild(ownerCell);

    const pagesCell = document.createElement("td");
    pagesCell.className = "px-4 py-3";
    pagesCell.textContent = site.pages?.length || 0;
    tr.appendChild(pagesCell);

    const statusCell = document.createElement("td");
    statusCell.className = "px-4 py-3";
    const badgeWrap = document.createElement("div");
    badgeWrap.className = "flex flex-wrap gap-1.5";
    if (site.isSuspended) {
      const b = document.createElement("span");
      b.className = "rounded-full bg-red-400/10 px-2 py-0.5 text-xs text-red-400";
      b.textContent = "Suspended";
      badgeWrap.appendChild(b);
    }
    if (site.isPasswordProtected) {
      const b = document.createElement("span");
      b.className = "rounded-full bg-charcoal-800 px-2 py-0.5 text-xs text-gold-500";
      b.textContent = "🔒 Locked";
      badgeWrap.appendChild(b);
    }
    statusCell.appendChild(badgeWrap);
    tr.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "px-4 py-3";
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "flex flex-wrap gap-2";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-secondary px-3 py-1.5 text-xs";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditModal(site));
    actionsWrap.appendChild(editBtn);

    const suspendBtn = document.createElement("button");
    suspendBtn.className = "btn-secondary px-3 py-1.5 text-xs";
    suspendBtn.textContent = site.isSuspended ? "Unsuspend" : "Suspend";
    suspendBtn.addEventListener("click", async () => {
      suspendBtn.disabled = true;
      await updateDoc(doc(db, "sites", site.id), { isSuspended: !site.isSuspended });
      await loadSites();
    });
    actionsWrap.appendChild(suspendBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-secondary px-3 py-1.5 text-xs text-red-400";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const confirmed = window.confirm(`Permanently delete "${site.name}" (/sites/${site.sitename})? This can't be undone.`);
      if (!confirmed) return;
      deleteBtn.disabled = true;
      await deleteDoc(doc(db, "sites", site.id));
      await loadSites();
    });
    actionsWrap.appendChild(deleteBtn);

    actionsCell.appendChild(actionsWrap);
    tr.appendChild(actionsCell);

    tbody.appendChild(tr);
  });
}

let editingSite = null;

function openEditModal(site) {
  editingSite = site;
  document.getElementById("edit-name").value = site.name;
  document.getElementById("edit-sitename").value = site.sitename;
  document.getElementById("edit-error").classList.add("hidden");
  const modal = document.getElementById("edit-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

document.addEventListener("click", (e) => {
  if (e.target.id === "edit-cancel") {
    const modal = document.getElementById("edit-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
});

document.addEventListener("click", async (e) => {
  if (e.target.id !== "edit-save") return;
  const name = document.getElementById("edit-name").value.trim();
  const sitename = document.getElementById("edit-sitename").value.trim();
  const errorEl = document.getElementById("edit-error");

  if (!name || !sitename) {
    errorEl.textContent = "Name and URL can't be empty.";
    errorEl.classList.remove("hidden");
    return;
  }

  e.target.disabled = true;
  e.target.textContent = "Saving…";
  try {
    await updateDoc(doc(db, "sites", editingSite.id), { name, sitename });
    document.getElementById("edit-modal").classList.add("hidden");
    document.getElementById("edit-modal").classList.remove("flex");
    await loadSites();
  } catch (err) {
    errorEl.textContent = "Couldn't save changes.";
    errorEl.classList.remove("hidden");
  } finally {
    e.target.disabled = false;
    e.target.textContent = "Save";
  }
});
