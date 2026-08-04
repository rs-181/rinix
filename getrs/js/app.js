import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---------- Block type registry ----------
// Single source of truth for every page: the builder's palette + properties
// panel, and the public site renderer, both read from this.
export const BLOCK_TYPES = {
  heading: {
    label: "Heading",
    icon: "H",
    defaultProps: { text: "Your heading here", level: "h2", color: "#ffffff" },
  },
  text: {
    label: "Text",
    icon: "¶",
    defaultProps: { text: "Write something about your site…", color: "#f2f2f5", size: "base" },
  },
  image: {
    label: "Image",
    icon: "◱",
    defaultProps: { src: "", alt: "" },
  },
  video: {
    label: "Video",
    icon: "▶",
    defaultProps: { url: "" },
  },
  carousel: {
    label: "Image slider",
    icon: "▤",
    defaultProps: { images: [] },
  },
  iframe: {
    label: "Embed",
    icon: "◫",
    defaultProps: { url: "", height: 480 },
  },
  button: {
    label: "Button",
    icon: "▭",
    defaultProps: { label: "Click me", href: "#" },
  },
  divider: {
    label: "Divider",
    icon: "—",
    defaultProps: {},
  },
};

export const PALETTE_ORDER = ["heading", "text", "image", "video", "carousel", "iframe", "button", "divider"];

let blockCounter = 0;
export function createBlock(type) {
  blockCounter += 1;
  const def = BLOCK_TYPES[type];
  return { id: `blk_${Date.now()}_${blockCounter}`, type, props: { ...def.defaultProps } };
}

export function slugify(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
}

// ---------- Social platforms ----------
export const SOCIAL_PLATFORMS = {
  instagram: { label: "Instagram", icon: "📷" },
  x: { label: "X / Twitter", icon: "✕" },
  facebook: { label: "Facebook", icon: "📘" },
  youtube: { label: "YouTube", icon: "▶" },
  tiktok: { label: "TikTok", icon: "🎵" },
  linkedin: { label: "LinkedIn", icon: "in" },
  website: { label: "Website / Other", icon: "🔗" },
};
export const SOCIAL_PLATFORM_ORDER = ["instagram", "x", "facebook", "youtube", "tiktok", "linkedin", "website"];

let socialCounter = 0;
export function createSocialLink(platform = "website") {
  socialCounter += 1;
  return { id: `soc_${Date.now()}_${socialCounter}`, platform, url: "" };
}

// ---------- Video URL parsing ----------
export function parseVideoUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let videoId = u.searchParams.get("v");
      if (!videoId && u.hostname.includes("youtu.be")) videoId = u.pathname.slice(1);
      if (!videoId && u.pathname.includes("/shorts/")) videoId = u.pathname.split("/shorts/")[1];
      if (videoId) return { kind: "iframe", src: `https://www.youtube.com/embed/${videoId}` };
    }
    if (u.hostname.includes("vimeo.com")) {
      const videoId = u.pathname.split("/").filter(Boolean).pop();
      if (videoId) return { kind: "iframe", src: `https://player.vimeo.com/video/${videoId}` };
    }
    return { kind: "file", src: url };
  } catch {
    return null;
  }
}

// ---------- Block rendering (DOM, not string — avoids XSS via innerHTML) ----------
const TEXT_SIZES = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Renders a single block into a real DOM node. Used identically by the
// builder canvas (editable chrome layered on top by builder.js) and the
// public site renderer, so what you see while editing matches what
// visitors see.
export function renderBlock(block) {
  const { type, props } = block;

  switch (type) {
    case "heading": {
      const tag = props.level || "h2";
      const sizes = { h1: "text-4xl", h2: "text-2xl", h3: "text-xl" };
      const node = el(tag, `font-display font-bold ${sizes[tag] || "text-2xl"}`, props.text);
      node.style.color = props.color || "#ffffff";
      node.style.opacity = "1";
      return node;
    }
    case "text": {
      const node = el("p", `${TEXT_SIZES[props.size] || TEXT_SIZES.base} leading-relaxed`, props.text);
      node.style.color = props.color || "#f2f2f5";
      node.style.opacity = "1";
      return node;
    }
    case "image": {
      if (!props.src) {
        return el(
          "div",
          "flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-charcoal-700 text-sm text-charcoal-300",
          "No image set"
        );
      }
      const img = el("img", "max-h-96 w-full rounded-xl object-cover");
      img.src = props.src;
      img.alt = props.alt || "";
      return img;
    }
    case "video": {
      const parsed = parseVideoUrl(props.url);
      if (!parsed) {
        return el(
          "div",
          "flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-charcoal-700 text-sm text-charcoal-300",
          "No video set"
        );
      }
      if (parsed.kind === "iframe") {
        const wrap = el("div", "aspect-video w-full overflow-hidden rounded-xl");
        const iframe = el("iframe", "h-full w-full");
        iframe.src = parsed.src;
        iframe.title = "Embedded video";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        return wrap;
      }
      const video = el("video", "w-full rounded-xl");
      video.controls = true;
      const source = document.createElement("source");
      source.src = parsed.src;
      video.appendChild(source);
      return video;
    }
    case "carousel":
      return renderCarousel(props.images || []);
    case "iframe": {
      if (!props.url) {
        return el(
          "div",
          "flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-charcoal-700 text-sm text-charcoal-300",
          "No embed URL set"
        );
      }
      const iframe = el("iframe", "w-full rounded-xl border border-charcoal-700");
      iframe.src = props.url;
      iframe.title = "Embedded content";
      iframe.style.height = `${props.height || 480}px`;
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms");
      return iframe;
    }
    case "button": {
      const a = el("a", "btn-primary inline-flex", props.label);
      a.href = props.href || "#";
      return a;
    }
    case "divider":
      return el("hr", "border-charcoal-700");
    default:
      return document.createComment("unknown block type");
  }
}

function renderCarousel(images) {
  const slides = (images || []).filter((img) => img.src);
  if (slides.length === 0) {
    return el(
      "div",
      "flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-charcoal-700 text-sm text-charcoal-300",
      "No slides yet"
    );
  }

  const wrap = el("div", "relative");
  const track = el(
    "div",
    "flex snap-x snap-mandatory overflow-x-auto rounded-xl scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  );
  slides.forEach((s) => {
    const img = el("img", "h-72 w-full shrink-0 snap-center object-cover sm:h-96");
    img.src = s.src;
    img.alt = s.alt || "";
    track.appendChild(img);
  });
  wrap.appendChild(track);

  if (slides.length > 1) {
    let activeIndex = 0;
    const dots = el("div", "mt-3 flex justify-center gap-1.5");
    const dotEls = slides.map((_, i) => {
      const dot = el("button", "h-1.5 w-1.5 rounded-full bg-charcoal-600 transition");
      dot.addEventListener("click", () => scrollToIndex(i));
      dots.appendChild(dot);
      return dot;
    });

    function updateDots() {
      dotEls.forEach((d, i) => {
        d.className = `h-1.5 w-1.5 rounded-full transition ${i === activeIndex ? "bg-gold-500" : "bg-charcoal-600"}`;
      });
    }
    function scrollToIndex(i) {
      activeIndex = Math.max(0, Math.min(i, slides.length - 1));
      track.scrollTo({ left: activeIndex * track.clientWidth, behavior: "smooth" });
      updateDots();
    }
    track.addEventListener("scroll", () => {
      if (track.clientWidth === 0) return;
      activeIndex = Math.round(track.scrollLeft / track.clientWidth);
      updateDots();
    });

    const prev = el("button", "absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-charcoal-950/70 text-white hover:bg-charcoal-950", "‹");
    prev.addEventListener("click", () => scrollToIndex(activeIndex - 1));
    const next = el("button", "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-charcoal-950/70 text-white hover:bg-charcoal-950", "›");
    next.addEventListener("click", () => scrollToIndex(activeIndex + 1));

    wrap.appendChild(prev);
    wrap.appendChild(next);
    wrap.appendChild(dots);
    updateDots();
  }

  return wrap;
}

// ---------- Auth helpers ----------
// Resolves once with the current user (or null) — lets page scripts
// `await getCurrentUser()` instead of nesting everything in a callback.
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

// Redirects to login.html if nobody's signed in. Call at the top of any
// protected page's script, before touching Firestore.
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ---------- Small UI helpers ----------
export function showError(elOrId, message) {
  const node = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!node) return;
  node.textContent = message;
  node.classList.remove("hidden");
}

export function hideError(elOrId) {
  const node = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!node) return;
  node.classList.add("hidden");
}
