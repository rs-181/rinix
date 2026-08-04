// Firebase client config. Unlike the old Next.js build, there's no server
// and no build step here, so these values can't be hidden in a .env file
// — they go directly into this file. That's fine: Firebase *client* API
// keys are not secrets, they just identify which project to talk to. Real
// security lives entirely in firestore.rules / storage.rules, which are
// enforced by Firebase's backend no matter what this file says.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// The only email allowed to see /rs-secret-dashboard-99x.html. This is
// duplicated (deliberately) in firestore.rules — that copy is the one
// that actually matters for security, since it's enforced server-side.
// This one just drives what the admin page's JS shows/hides.
export const OWNER_EMAIL = "rsandhi37@gmail.com";

// The origin sites are published under — used to build shareable links.
export const SITE_ORIGIN = "https://getrs.vercel.app";
