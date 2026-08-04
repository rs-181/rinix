import { auth, googleProvider } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { showError, hideError } from "./app.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");
const googleBtn = document.getElementById("google-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError(errorEl);
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in…";
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(errorEl, "That email and password combination didn't work.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
});

googleBtn.addEventListener("click", async () => {
  hideError(errorEl);
  googleBtn.disabled = true;
  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(errorEl, "Couldn't sign in with Google.");
  } finally {
    googleBtn.disabled = false;
  }
});
