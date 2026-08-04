import { db, SITE_ORIGIN } from "./firebase-init.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  requireAuth, slugify, renderBlock, createBlock,
  BLOCK_TYPES, PALETTE_ORDER,
  SOCIAL_PLATFORMS, SOCIAL_PLATFORM_ORDER, createSocialLink,
} from "./app.js";
import { uploadSiteImage, ALLOWED_MIME_TYPES } from "./imageUpload.js";

const user = await requireAuth();
if (!user) throw new Error("redirecting to login");

const params = new URLSearchParams(window.location.search);
const siteId = params.get("site");

const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");
const deniedMessage = document.getElementById("denied-message");
const builderRoot = document.getElementById("builder-root");

if (!siteId) {
  window.location.href = "dashboard.html";
  throw new Error("no site id");
}

const ref = doc(db, "sites", siteId);
const snap = await getDoc(ref);

if (!snap.exists()) {
  loadingScreen.classList.add("hidden");
  deniedMessage.textContent = "That site doesn't exist.";
  deniedScreen.classList.remove("hidden");
  deniedScreen.classList.add("flex");
  throw new Error("not found");
}

const siteData = snap.data();
if (siteData.ownerId !== user.uid) {
  loadingScreen.classList.add("hidden");
  deniedMessage.textContent = "You don't have access to that site.";
  deniedScreen.classList.remove("hidden");
  deniedScreen.classList.add("flex");
  throw new Error("forbidden");
}

// ---------- State ----------
let pages = siteData.pages?.length ? siteData.pages : [{ id: "home", name: "Home", slug: "home", blocks: [] }];
let footer = siteData.footer || { socialLinks: [] };
let theme = siteData.theme || { backgroundColor: "", backgroundImageUrl: "" };
let activePageId = pages[0]?.id;
let selectedBlockId = null;
let dirty = false;

function markDirty() {
  dirty = true;
  document.getElementById("save-btn").disabled = false;
  document.getElementById("dirty-flag").classList.remove("hidden");
  document.getElementById("saved-flag").classList.add("hidden");
}

function activePage() {
  return pages.find((p) => p.id === activePageId);
}

// ---------- Header ----------
document.getElementById("site-title").textContent = siteData.name;
document.getElementById("site-title").classList.remove("hidden");
document.getElementById("view-live-link").href = `${SITE_ORIGIN}/sites/${siteData.sitename}`;
if (siteData.isSuspended) document.getElementById("suspended-banner").classList.remove("hidden");

loadingScreen.classList.add("hidden");
builderRoot.classList.remove("hidden");

document.getElementById("save-btn").addEventListener("click", handleSave);

async function handleSave() {
  const btn = document.getElementById("save-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await updateDoc(ref, { pages, footer, theme });
    dirty = false;
    document.getElementById("dirty-flag").classList.add("hidden");
    document.getElementById("saved-flag").classList.remove("hidden");
    setTimeout(() => document.getElementById("saved-flag").classList.add("hidden"), 2000);
  } finally {
    btn.textContent = "Save";
    btn.disabled = dirty ? false : true;
  }
}

// ---------- Page sidebar ----------
function renderPageSidebar() {
  const list = document.getElementById("page-list");
  list.innerHTML = "";
  pages.forEach((page) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    const isActive = page.id === activePageId;
    row.className = `group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
      isActive ? "bg-gold-500 text-charcoal-950 font-medium" : "text-white hover:bg-charcoal-800"
    }`;

    const nameBtn = document.createElement("button");
    nameBtn.className = "flex-1 text-left";
    nameBtn.textContent = page.name;
    nameBtn.addEventListener("click", () => {
      activePageId = page.id;
      selectedBlockId = null;
      renderPageSidebar();
      renderCanvas();
      renderPropertiesPanel();
    });
    row.appendChild(nameBtn);

    const actions = document.createElement("div");
    actions.className = `flex gap-1 ${isActive ? "text-charcoal-900" : "text-charcoal-300"}`;
    const renameBtn = document.createElement("button");
    renameBtn.title = "Rename";
    renameBtn.textContent = "✎";
    renameBtn.addEventListener("click", () => renamePage(page.id));
    actions.appendChild(renameBtn);

    if (pages.length > 1) {
      const delBtn = document.createElement("button");
      delBtn.title = "Delete page";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => deletePage(page.id));
      actions.appendChild(delBtn);
    }
    row.appendChild(actions);
    li.appendChild(row);
    list.appendChild(li);
  });
}

function renamePage(pageId) {
  const current = pages.find((p) => p.id === pageId);
  const name = window.prompt("Rename page:", current?.name);
  if (!name || !name.trim()) return;
  current.name = name.trim();
  current.slug = slugify(name);
  markDirty();
  renderPageSidebar();
}

function deletePage(pageId) {
  const target = pages.find((p) => p.id === pageId);
  if (!window.confirm(`Delete the "${target?.name}" page?`)) return;
  pages = pages.filter((p) => p.id !== pageId);
  if (activePageId === pageId) activePageId = pages[0]?.id || null;
  markDirty();
  renderPageSidebar();
  renderCanvas();
  renderPropertiesPanel();
}

document.getElementById("add-page-btn").addEventListener("click", () => {
  const name = window.prompt("Name this page:");
  if (!name || !name.trim()) return;
  const slug = slugify(name);
  const id = `${slug}-${Date.now().toString(36)}`;
  pages.push({ id, name: name.trim(), slug, blocks: [] });
  activePageId = id;
  markDirty();
  renderPageSidebar();
  renderCanvas();
});

// ---------- Block palette ----------
function renderPalette() {
  const palette = document.getElementById("block-palette");
  palette.innerHTML = "";
  PALETTE_ORDER.forEach((type) => {
    const def = BLOCK_TYPES[type];
    const btn = document.createElement("button");
    btn.draggable = true;
    btn.className = "flex w-full cursor-grab items-center gap-3 rounded-xl border border-charcoal-700 bg-charcoal-800 px-3 py-2.5 text-left text-sm transition hover:border-gold-500";
    btn.innerHTML = `<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-charcoal-700 font-display text-sm text-gold-500">${def.icon}</span>`;
    const label = document.createElement("span");
    label.textContent = def.label;
    btn.appendChild(label);
    btn.addEventListener("click", () => addBlock(type));
    btn.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-rsnet-block-type", type);
      e.dataTransfer.effectAllowed = "copy";
    });
    palette.appendChild(btn);
  });
}

function addBlock(type) {
  activePage().blocks.push(createBlock(type));
  markDirty();
  renderCanvas();
}

// ---------- Canvas ----------
function renderCanvas() {
  const canvas = document.getElementById("canvas");
  canvas.innerHTML = "";
  const blocks = activePage()?.blocks || [];

  if (blocks.length === 0) {
    canvas.className = "card flex min-h-[400px] items-center justify-center border-dashed p-10 text-center text-sm text-charcoal-300";
    canvas.textContent = "Drag a block here from the left, or tap one to add it.";
    canvas.addEventListener("dragover", (e) => e.preventDefault());
    canvas.addEventListener("drop", (e) => handleDrop(e, 0));
    return;
  }
  canvas.className = "card min-h-[400px] p-6 sm:p-10";

  const slot = (index) => {
    const s = document.createElement("div");
    s.className = "relative h-2";
    s.addEventListener("dragover", (e) => {
      e.preventDefault();
      s.dataset.active = "1";
      s.innerHTML = '<div class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-gold-500"></div>';
    });
    s.addEventListener("dragleave", () => { s.innerHTML = ""; });
    s.addEventListener("drop", (e) => handleDrop(e, index));
    return s;
  };

  canvas.appendChild(slot(0));
  blocks.forEach((block, i) => {
    const wrap = document.createElement("div");
    const item = document.createElement("div");
    item.draggable = true;
    const isSelected = block.id === selectedBlockId;
    item.className = `group relative cursor-pointer rounded-xl border p-3 transition ${
      isSelected ? "border-gold-500 bg-charcoal-800" : "border-transparent hover:border-charcoal-700 hover:bg-charcoal-800/60"
    }`;
    item.addEventListener("click", () => {
      selectedBlockId = block.id;
      renderCanvas();
      renderPropertiesPanel();
    });
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-rsnet-block-id", block.id);
      e.dataTransfer.effectAllowed = "move";
    });

    const content = document.createElement("div");
    content.appendChild(renderBlock(block));
    item.appendChild(content);

    const controls = document.createElement("div");
    controls.className = "absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100";
    controls.appendChild(iconBtn("↑", "Move up", i === 0, (e) => { e.stopPropagation(); moveBlock(block.id, "up"); }));
    controls.appendChild(iconBtn("↓", "Move down", i === blocks.length - 1, (e) => { e.stopPropagation(); moveBlock(block.id, "down"); }));
    controls.appendChild(iconBtn("✕", "Remove block", false, (e) => { e.stopPropagation(); deleteBlock(block.id); }, true));
    item.appendChild(controls);

    wrap.appendChild(item);
    wrap.appendChild(slot(i + 1));
    canvas.appendChild(wrap);
  });
}

function iconBtn(symbol, title, disabled, onClick, danger) {
  const b = document.createElement("button");
  b.textContent = symbol;
  b.title = title;
  b.disabled = disabled;
  b.className = `flex h-6 w-6 items-center justify-center rounded-full bg-charcoal-900 text-xs ${
    danger ? "text-charcoal-300 hover:text-red-400" : "text-charcoal-300 hover:text-gold-500"
  } disabled:opacity-30`;
  b.addEventListener("click", onClick);
  return b;
}

function handleDrop(e, index) {
  e.preventDefault();
  const newType = e.dataTransfer.getData("application/x-rsnet-block-type");
  const reorderId = e.dataTransfer.getData("application/x-rsnet-block-id");
  const blocks = activePage().blocks;

  if (newType) {
    blocks.splice(index, 0, createBlock(newType));
  } else if (reorderId) {
    const fromIndex = blocks.findIndex((b) => b.id === reorderId);
    if (fromIndex === -1) return;
    const [moved] = blocks.splice(fromIndex, 1);
    const adjusted = fromIndex < index ? index - 1 : index;
    blocks.splice(adjusted, 0, moved);
  }
  markDirty();
  renderCanvas();
}

function moveBlock(blockId, direction) {
  const blocks = activePage().blocks;
  const index = blocks.findIndex((b) => b.id === blockId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= blocks.length) return;
  [blocks[index], blocks[targetIndex]] = [blocks[targetIndex], blocks[index]];
  markDirty();
  renderCanvas();
}

function deleteBlock(blockId) {
  activePage().blocks = activePage().blocks.filter((b) => b.id !== blockId);
  if (selectedBlockId === blockId) selectedBlockId = null;
  markDirty();
  renderCanvas();
  renderPropertiesPanel();
}

// ---------- Properties panel ----------
function field(labelText, inputEl) {
  const wrap = document.createElement("div");
  const label = document.createElement("label");
  label.className = "mb-1 block text-sm text-charcoal-300";
  label.textContent = labelText;
  wrap.appendChild(label);
  wrap.appendChild(inputEl);
  return wrap;
}

function textInput(value, onInput, placeholder) {
  const input = document.createElement("input");
  input.className = "input";
  input.value = value || "";
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener("input", () => onInput(input.value));
  return input;
}

function colorInput(value, onInput) {
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-2";
  const picker = document.createElement("input");
  picker.type = "color";
  picker.className = "h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-charcoal-700 bg-charcoal-800";
  picker.value = value || "#ffffff";
  const text = document.createElement("input");
  text.className = "input";
  text.value = value || "";
  picker.addEventListener("input", () => { text.value = picker.value; onInput(picker.value); });
  text.addEventListener("input", () => onInput(text.value));
  wrap.appendChild(picker);
  wrap.appendChild(text);
  return wrap;
}

function renderPropertiesPanel() {
  const panel = document.getElementById("properties-panel");
  panel.innerHTML = "";
  const block = activePage()?.blocks.find((b) => b.id === selectedBlockId);

  if (!block) {
    panel.innerHTML = '<p class="text-sm text-charcoal-300">Select a block on the page to edit it here.</p>';
    return;
  }

  const def = BLOCK_TYPES[block.type];
  const header = document.createElement("div");
  header.className = "mb-4 flex items-center justify-between";
  header.innerHTML = `<h2 class="text-xs font-semibold uppercase tracking-widest text-charcoal-300">${def.label}</h2>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "text-xs text-charcoal-300 hover:text-white";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => { selectedBlockId = null; renderCanvas(); renderPropertiesPanel(); });
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "space-y-3";

  const update = (key, value) => {
    block.props[key] = value;
    markDirty();
    renderCanvas();
  };

  if (block.type === "heading") {
    body.appendChild(field("Text", textInput(block.props.text, (v) => update("text", v))));
    const select = document.createElement("select");
    select.className = "input";
    [["h1", "Large (H1)"], ["h2", "Medium (H2)"], ["h3", "Small (H3)"]].forEach(([val, label]) => {
      const opt = document.createElement("option");
      opt.value = val; opt.textContent = label;
      if (block.props.level === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => update("level", select.value));
    body.appendChild(field("Size", select));
    body.appendChild(field("Color", colorInput(block.props.color, (v) => update("color", v))));
  }

  if (block.type === "text") {
    const textarea = document.createElement("textarea");
    textarea.className = "input min-h-[100px] resize-y";
    textarea.value = block.props.text || "";
    textarea.addEventListener("input", () => update("text", textarea.value));
    body.appendChild(field("Text", textarea));

    const sizeSelect = document.createElement("select");
    sizeSelect.className = "input";
    [["sm", "Small"], ["base", "Regular"], ["lg", "Large"], ["xl", "Extra large"]].forEach(([val, label]) => {
      const opt = document.createElement("option");
      opt.value = val; opt.textContent = label;
      if ((block.props.size || "base") === val) opt.selected = true;
      sizeSelect.appendChild(opt);
    });
    sizeSelect.addEventListener("change", () => update("size", sizeSelect.value));
    body.appendChild(field("Text size", sizeSelect));
    body.appendChild(field("Text color", colorInput(block.props.color, (v) => update("color", v))));
  }

  if (block.type === "image") {
    body.appendChild(field("Image URL", textInput(block.props.src, (v) => update("src", v), "https://example.com/photo.jpg")));
    body.appendChild(uploadDivider());
    body.appendChild(uploadButton((url) => update("src", url)));
    body.appendChild(field("Alt text", textInput(block.props.alt, (v) => update("alt", v), "Describe the image")));
  }

  if (block.type === "video") {
    body.appendChild(field("Video URL", textInput(block.props.url, (v) => update("url", v), "YouTube, Vimeo, or a direct .mp4 link")));
  }

  if (block.type === "iframe") {
    body.appendChild(field("Embed URL", textInput(block.props.url, (v) => update("url", v), "https://example.com/widget")));
    const heightInput = document.createElement("input");
    heightInput.type = "number";
    heightInput.min = "150";
    heightInput.className = "input";
    heightInput.value = block.props.height || 480;
    heightInput.addEventListener("input", () => update("height", Number(heightInput.value) || 480));
    body.appendChild(field("Height (px)", heightInput));
    const note = document.createElement("p");
    note.className = "text-xs text-charcoal-300";
    note.textContent = "Only embed sites you trust — this loads their content directly on your page.";
    body.appendChild(note);
  }

  if (block.type === "carousel") {
    const slidesWrap = document.createElement("div");
    slidesWrap.className = "space-y-3";
    (block.props.images || []).forEach((slide, i) => {
      const slideCard = document.createElement("div");
      slideCard.className = "rounded-xl border border-charcoal-700 p-3";
      const top = document.createElement("div");
      top.className = "mb-2 flex items-center justify-between";
      top.innerHTML = `<span class="text-xs font-medium text-charcoal-300">Slide ${i + 1}</span>`;
      const removeBtn = document.createElement("button");
      removeBtn.className = "text-xs text-charcoal-300 hover:text-red-400";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        block.props.images = block.props.images.filter((s) => s.id !== slide.id);
        markDirty(); renderCanvas(); renderPropertiesPanel();
      });
      top.appendChild(removeBtn);
      slideCard.appendChild(top);

      const urlInput = textInput(slide.src, (v) => { slide.src = v; markDirty(); renderCanvas(); }, "Image URL");
      urlInput.classList.add("mb-2");
      slideCard.appendChild(urlInput);

      slideCard.appendChild(uploadButton((url) => { slide.src = url; markDirty(); renderCanvas(); renderPropertiesPanel(); }, "text-xs mb-2"));

      const altInput = textInput(slide.alt, (v) => { slide.alt = v; markDirty(); }, "Alt text");
      slideCard.appendChild(altInput);

      slidesWrap.appendChild(slideCard);
    });
    body.appendChild(slidesWrap);

    const addSlideBtn = document.createElement("button");
    addSlideBtn.className = "btn-secondary w-full text-sm";
    addSlideBtn.textContent = "+ Add slide";
    addSlideBtn.addEventListener("click", () => {
      if (!block.props.images) block.props.images = [];
      block.props.images.push({ id: `slide_${Date.now()}`, src: "", alt: "" });
      markDirty(); renderCanvas(); renderPropertiesPanel();
    });
    body.appendChild(addSlideBtn);
  }

  if (block.type === "button") {
    body.appendChild(field("Label", textInput(block.props.label, (v) => update("label", v))));
    body.appendChild(field("Link (URL or page)", textInput(block.props.href, (v) => update("href", v), "https:// or /about")));
  }

  if (block.type === "divider") {
    const note = document.createElement("p");
    note.className = "text-sm text-charcoal-300";
    note.textContent = "A divider has no settings — it just separates content.";
    body.appendChild(note);
  }

  panel.appendChild(body);

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-secondary mt-5 w-full text-sm text-red-400";
  removeBtn.textContent = "Remove block";
  removeBtn.addEventListener("click", () => deleteBlock(block.id));
  panel.appendChild(removeBtn);
}

function uploadDivider() {
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-3";
  wrap.innerHTML = '<div class="h-px flex-1 bg-charcoal-700"></div><span class="text-xs text-charcoal-300">or</span><div class="h-px flex-1 bg-charcoal-700"></div>';
  return wrap;
}

function uploadButton(onUploaded, extraClass) {
  const wrap = document.createElement("div");
  const label = document.createElement("label");
  label.className = `btn-secondary flex w-full cursor-pointer items-center justify-center text-sm ${extraClass || ""}`;
  const labelText = document.createElement("span");
  labelText.textContent = "Upload image";
  label.appendChild(labelText);
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ALLOWED_MIME_TYPES.join(",");
  input.className = "hidden";
  const errorP = document.createElement("p");
  errorP.className = "mt-1 hidden text-sm text-red-400";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    errorP.classList.add("hidden");
    labelText.textContent = "Uploading…";
    input.disabled = true;
    try {
      const url = await uploadSiteImage({ siteId, ownerId: user.uid, file });
      onUploaded(url);
    } catch (err) {
      errorP.textContent = err.message || "Couldn't upload that image.";
      errorP.classList.remove("hidden");
    } finally {
      labelText.textContent = "Upload image";
      input.disabled = false;
    }
  });

  label.appendChild(input);
  wrap.appendChild(label);
  wrap.appendChild(errorP);
  return wrap;
}

// ---------- Footer & social modal ----------
const footerModal = document.getElementById("footer-modal");
document.getElementById("footer-btn").addEventListener("click", () => {
  renderSocialLinks();
  footerModal.classList.remove("hidden");
  footerModal.classList.add("flex");
});
document.getElementById("footer-modal-close").addEventListener("click", closeFooterModal);
document.getElementById("footer-modal-done").addEventListener("click", closeFooterModal);
function closeFooterModal() {
  footerModal.classList.add("hidden");
  footerModal.classList.remove("flex");
}

function renderSocialLinks() {
  const list = document.getElementById("social-links-list");
  list.innerHTML = "";
  const links = footer.socialLinks || [];

  if (links.length === 0) {
    list.innerHTML = '<p class="rounded-xl border border-dashed border-charcoal-700 p-4 text-center text-sm text-charcoal-300">No social links yet.</p>';
  }

  links.forEach((link) => {
    const row = document.createElement("div");
    row.className = "flex items-center gap-2";

    const select = document.createElement("select");
    select.className = "input w-40 shrink-0";
    SOCIAL_PLATFORM_ORDER.forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${SOCIAL_PLATFORMS[key].icon} ${SOCIAL_PLATFORMS[key].label}`;
      if (link.platform === key) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => { link.platform = select.value; markDirty(); });

    const urlInput = document.createElement("input");
    urlInput.className = "input flex-1";
    urlInput.value = link.url || "";
    urlInput.placeholder = "https://…";
    urlInput.addEventListener("input", () => { link.url = urlInput.value; markDirty(); });

    const removeBtn = document.createElement("button");
    removeBtn.className = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-charcoal-700 text-charcoal-300 hover:border-red-400 hover:text-red-400";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      footer.socialLinks = footer.socialLinks.filter((l) => l.id !== link.id);
      markDirty();
      renderSocialLinks();
    });

    row.appendChild(select);
    row.appendChild(urlInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

document.getElementById("add-social-btn").addEventListener("click", () => {
  if (!footer.socialLinks) footer.socialLinks = [];
  footer.socialLinks.push(createSocialLink());
  markDirty();
  renderSocialLinks();
});

// ---------- Theme modal ----------
const themeModal = document.getElementById("theme-modal");
const themeColorPicker = document.getElementById("theme-color-picker");
const themeColorText = document.getElementById("theme-color-text");
const themeImageUrl = document.getElementById("theme-image-url");

document.getElementById("theme-btn").addEventListener("click", () => {
  themeColorPicker.value = theme.backgroundColor || "#0a0a0b";
  themeColorText.value = theme.backgroundColor || "";
  themeImageUrl.value = theme.backgroundImageUrl || "";
  themeModal.classList.remove("hidden");
  themeModal.classList.add("flex");
});
document.getElementById("theme-modal-done").addEventListener("click", () => {
  themeModal.classList.add("hidden");
  themeModal.classList.remove("flex");
});
themeColorPicker.addEventListener("input", () => { themeColorText.value = themeColorPicker.value; theme.backgroundColor = themeColorPicker.value; markDirty(); });
themeColorText.addEventListener("input", () => { theme.backgroundColor = themeColorText.value; markDirty(); });
document.getElementById("theme-color-clear").addEventListener("click", () => { theme.backgroundColor = ""; themeColorText.value = ""; markDirty(); });
themeImageUrl.addEventListener("input", () => { theme.backgroundImageUrl = themeImageUrl.value; markDirty(); });

document.getElementById("theme-image-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const errorEl = document.getElementById("theme-upload-error");
  const labelEl = document.getElementById("theme-upload-label");
  errorEl.classList.add("hidden");
  labelEl.textContent = "Uploading…";
  try {
    const url = await uploadSiteImage({ siteId, ownerId: user.uid, file });
    theme.backgroundImageUrl = url;
    themeImageUrl.value = url;
    markDirty();
  } catch (err) {
    errorEl.textContent = err.message || "Couldn't upload that image.";
    errorEl.classList.remove("hidden");
  } finally {
    labelEl.textContent = "Upload image";
  }
});

// ---------- Initial render ----------
renderPageSidebar();
renderPalette();
renderCanvas();
renderPropertiesPanel();
