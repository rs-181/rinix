import { storage } from "./firebase-init.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function validateImageFile(file) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Only image files (PNG, JPEG, WEBP, GIF) can be uploaded — no .zip, .rar, .mp4, or other file types.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Images must be 5MB or smaller.");
  }
}

// browser-image-compression, loaded globally via CDN <script> tag on pages
// that need uploads (see imageCompression on window).
async function compressImage(file) {
  const targetMB = Math.max((file.size / (1024 * 1024)) * 0.8, 0.1);
  return window.imageCompression(file, {
    maxSizeMB: targetMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
  });
}

export async function uploadSiteImage({ siteId, ownerId, file }) {
  validateImageFile(file);
  const compressed = await compressImage(file);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `sites/${siteId}/${ownerId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, compressed, { contentType: compressed.type });
  return getDownloadURL(storageRef);
}
