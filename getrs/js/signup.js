import { auth, googleProvider } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { showError, hideError } from "./app.js";

const form = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");
const googleBtn = document.getElementById("google-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError(errorEl);

  if (passwordInput.value.length < 6) {
    showError(errorEl, "Password must be at least 6 characters.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(errorEl, "Couldn't create that account. The email may already be in use.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign up free";
  }
});

googleBtn.addEventListener("click", async () => {
  hideError(errorEl);
  googleBtn.disabled = true;
  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(errorEl, "Couldn't sign up with Google.");
  } finally {
    googleBtn.disabled = false;
  }
});
