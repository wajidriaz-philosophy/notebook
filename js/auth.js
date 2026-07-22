// ============================================================================
// auth.js — sign in / sign up (with a simulated OTP step) / sign out, and
// the central onAuthStateChanged listener that drives admin visibility,
// the profile page and page-view counting.
// ============================================================================

import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  increment,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";
import { closeAuthModal } from "./modals.js";
import { switchDashboardTab } from "./tabs.js";
import { renderAdminUserLedger, fetchAnalyticsMetrics } from "./admin.js";
import { loadUserProfile, renderProfileView } from "./profile.js";

const ADMIN_EMAIL = "wajidriazadmin@hub.com";

export function setContactMode(mode) {
  state.activeContactMode = mode;
  const emailTab = document.getElementById("contact-tab-email");
  const phoneTab = document.getElementById("contact-tab-phone");
  emailTab.classList.toggle("active", mode === "email");
  phoneTab.classList.toggle("active", mode === "phone");
  emailTab.setAttribute("aria-selected", String(mode === "email"));
  phoneTab.setAttribute("aria-selected", String(mode === "phone"));
  document.getElementById("auth-contact-label").innerText = mode === "email" ? "Email Address" : "Phone Number";
  document.getElementById("auth-email").placeholder = mode === "email" ? "name@domain.com" : "e.g., 03001234567";
  document.getElementById("auth-email").value = "";
}

export function toggleAuthMode(target) {
  state.activeAuthMode = target;
  document.getElementById("auth-modal-title").innerText = target === "login" ? "Sign In Context" : "Create Viewer Account";

  const msgEl = document.getElementById("auth-toggle-msg");
  msgEl.innerHTML =
    target === "login"
      ? `Need a viewer signature profile? <button type="button" class="link-btn" data-action="toggle-auth-mode" data-mode="signup">Sign up here</button>`
      : `Existing authorization context? <button type="button" class="link-btn" data-action="toggle-auth-mode" data-mode="login">Return to Login</button>`;

  document.getElementById("group-auth-fullname").classList.toggle("hidden", target !== "signup");
  document.getElementById("group-auth-username").classList.toggle("hidden", target !== "signup");
  document.getElementById("group-auth-pass").classList.remove("hidden");
  document.getElementById("group-auth-otp").classList.add("hidden");

  const actionBtn = document.getElementById("auth-action-btn");
  actionBtn.innerText = "Next Phase";
  actionBtn.dataset.action = target === "login" ? "login" : "register";
}

function resolveAuthIdentifier(rawValue) {
  if (state.activeContactMode === "email") return rawValue;
  const digitsOnly = rawValue.replace(/\D/g, "");
  return `${digitsOnly}@notebook-phone.local`;
}

export async function executeLoginWorkflow() {
  const rawContact = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-pass").value;

  if (!rawContact || !pass) {
    showToast("Please enter your contact info and password.", "warning");
    return;
  }

  const loginEmail = resolveAuthIdentifier(rawContact);
  try {
    await signInWithEmailAndPassword(auth, loginEmail, pass);
    closeAuthModal();
    showToast("Signed in successfully.", "success");
  } catch (e) {
    showToast(`Sign-in failed: ${e.message}`, "error");
  }
}

export function executeRegistrationWorkflow() {
  const fullName = document.getElementById("auth-fullname").value.trim();
  const username = document.getElementById("auth-username").value.trim();
  const rawContact = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-pass").value;

  if (!fullName || !username) {
    showToast("Please provide your full name and a username.", "warning");
    return;
  }
  if (!rawContact) {
    showToast(`Please provide your ${state.activeContactMode === "email" ? "email address" : "phone number"}.`, "warning");
    return;
  }
  if (pass.length < 6) {
    showToast("Password must be at least 6 characters.", "warning");
    return;
  }

  const resolvedEmail = resolveAuthIdentifier(rawContact);
  state.cachedRegDetails = {
    fullName,
    username,
    contactMode: state.activeContactMode,
    contactValue: rawContact,
    email: resolvedEmail,
    pass,
  };
  state.generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // In a production build this OTP would be sent via SMS/email by a backend
  // function — shown here as a toast since this is a client-only simulation.
  showToast(`Verification token (simulation): ${state.generatedOTP}`, "warning", 8000);

  document.getElementById("auth-modal-title").innerText = "Enter 6-Digit OTP Token";
  document.getElementById("group-auth-fullname").classList.add("hidden");
  document.getElementById("group-auth-username").classList.add("hidden");
  document.getElementById("group-auth-pass").classList.add("hidden");
  document.getElementById("group-auth-otp").classList.remove("hidden");
  document.getElementById("auth-action-btn").dataset.action = "verify-otp";
}

export async function verifyRegistrationOTP() {
  const entered = document.getElementById("auth-otp-input").value.trim();
  if (entered !== state.generatedOTP || !state.cachedRegDetails) {
    showToast("OTP mismatch. Please check the code and try again.", "error");
    return;
  }

  try {
    const details = state.cachedRegDetails;
    const res = await createUserWithEmailAndPassword(auth, details.email, details.pass);
    await setDoc(doc(db, "users", res.user.uid), {
      fullName: details.fullName,
      username: details.username,
      contactMode: details.contactMode,
      contactValue: details.contactValue,
      email: details.email,
      joined: new Date().toISOString(),
      bio: "",
    });
    closeAuthModal();
    showToast(`Welcome, ${details.fullName}! Your account is ready.`, "success");
  } catch (e) {
    showToast(`Registration failed: ${e.message}`, "error");
  }
}

export async function executeLogoutWorkflow() {
  await signOut(auth);
  showToast("You've been signed out.", "success");
}

async function incrementGlobalPageView() {
  const metricsRef = doc(db, "analytics", "global_metrics");
  try {
    await updateDoc(metricsRef, { views: increment(1) });
  } catch (e) {
    await setDoc(metricsRef, { views: 1, total_downloads: 0 }, { merge: true });
  }
  fetchAnalyticsMetrics();
}

export function initAuthStateListener() {
  onAuthStateChanged(auth, (user) => {
    const tabProfile = document.getElementById("tab-profile");
    const authTrigger = document.getElementById("auth-action-trigger");

    if (user) {
      state.userEmailSignature = user.email;
      authTrigger.innerText = "Sign Out Session";
      tabProfile?.classList.remove("hidden");
      loadUserProfile(user.uid);

      if (user.email === ADMIN_EMAIL) {
        state.currentUserIsAdmin = true;
        document.getElementById("profile-role-str").innerText = "ADMIN CONSOLE";
        document.getElementById("tab-admin").classList.remove("hidden");
        document.getElementById("publish-trigger-btn").classList.remove("hidden");
        document.getElementById("admin-only-stats-wrapper").classList.remove("hidden");
        renderAdminUserLedger();
      } else {
        state.currentUserIsAdmin = false;
        document.getElementById("profile-role-str").innerText = "VERIFIED VIEWER";
        document.getElementById("tab-admin").classList.add("hidden");
        document.getElementById("publish-trigger-btn").classList.add("hidden");
        document.getElementById("admin-only-stats-wrapper").classList.add("hidden");
      }
    } else {
      state.userEmailSignature = null;
      state.currentUserIsAdmin = false;
      state.currentUserProfile = null;
      document.getElementById("profile-role-str").innerText = "Physicist & Philosopher";
      authTrigger.innerText = "Sign In / Create Account";
      document.getElementById("tab-admin").classList.add("hidden");
      document.getElementById("publish-trigger-btn").classList.add("hidden");
      document.getElementById("admin-only-stats-wrapper").classList.add("hidden");
      tabProfile?.classList.add("hidden");
      renderProfileView();
      switchDashboardTab("home");
    }

    if (!state.currentUserIsAdmin && !state.hasCountedGlobalView) {
      incrementGlobalPageView();
      state.hasCountedGlobalView = true;
    }
  });
}
