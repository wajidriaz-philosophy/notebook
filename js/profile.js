// ============================================================================
// profile.js — the user profile page shown after sign up / login.
// Displays account details + bio, lets the user edit their name/username/bio,
// and (for admins) links back to the admin console.
// ============================================================================

import { auth, db, doc, getDoc, setDoc, uploadToCloudinary } from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";
import { closeEditProfileModal, openEditProfileModal } from "./modals.js";

function initialFromUsername(username) {
  const trimmed = (username || "").trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

export function renderProfileView() {
  const profile = state.currentUserProfile;
  const root = document.getElementById("view-profile");
  if (!root) return;

  if (!profile) {
    root.innerHTML = `<p style="color: var(--text-muted);">Sign in to view your profile.</p>`;
    return;
  }

  const joinedDate = profile.joined ? new Date(profile.joined).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "N/A";
  const contactLabel = profile.contactMode === "phone" ? "Phone Number" : "Email Address";
  const roleLabel = state.currentUserIsAdmin ? "Admin" : "Verified Viewer";

  const avatarHTML = profile.avatarUrl
    ? `<img class="avatar avatar-lg avatar-img" src="${profile.avatarUrl}" alt="${escapeHTML(profile.fullName || "Profile")}'s profile picture">`
    : `<div class="avatar avatar-lg" aria-hidden="true">${initialFromUsername(profile.username)}</div>`;

  const statCards = state.currentUserIsAdmin
    ? `
    <div class="profile-stat-card">
      <h3>${state.allEntriesCache.length}</h3>
      <p>Published Entries</p>
    </div>
    <div class="profile-stat-card">
      <h3>${joinedDate}</h3>
      <p>Member Since</p>
    </div>
    <div class="profile-stat-card">
      <h3>${roleLabel}</h3>
      <p>Account Role</p>
    </div>`
    : `
    <div class="profile-stat-card">
      <h3>${joinedDate}</h3>
      <p>Member Since</p>
    </div>
    <div class="profile-stat-card">
      <h3>${roleLabel}</h3>
      <p>Account Role</p>
    </div>`;

  root.innerHTML = `
    <div class="profile-page-header">
      <div class="profile-avatar-wrapper">
        ${avatarHTML}
      </div>
      <div class="profile-name-block">
        <h2>${escapeHTML(profile.fullName || "Unnamed User")}</h2>
        <div class="username">@${escapeHTML(profile.username || "user")}</div>
        <span class="profile-role-pill">${roleLabel}</span>
        <div class="profile-photo-actions">
          <button type="button" class="icon-action-btn" data-action="trigger-file-input" data-target="profile-avatar-input">📷 ${
            profile.avatarUrl ? "Change Photo" : "Add Photo"
          }</button>
          ${
            profile.avatarUrl
              ? `<button type="button" class="icon-action-btn danger" data-action="remove-profile-avatar">🗑️ Remove Photo</button>`
              : ""
          }
        </div>
      </div>
    </div>

    <div class="profile-grid">
      ${statCards}
    </div>

    <div class="profile-section">
      <h4>Account Details</h4>
      <div class="profile-detail-row"><span>Full Name</span><span>${escapeHTML(profile.fullName || "N/A")}</span></div>
      <div class="profile-detail-row"><span>Username</span><span>@${escapeHTML(profile.username || "N/A")}</span></div>
      <div class="profile-detail-row"><span>${contactLabel}</span><span>${escapeHTML(profile.contactValue || "N/A")}</span></div>
      <div class="profile-detail-row"><span>Joined</span><span>${joinedDate}</span></div>
    </div>

    <div class="profile-section">
      <h4>Bio</h4>
      <p class="${profile.bio ? "profile-bio-text" : "profile-bio-empty"}">${
    profile.bio ? escapeHTML(profile.bio) : "No bio yet. Tell others a bit about yourself."
  }</p>
    </div>

    <div class="profile-actions-row">
      <button class="btn-primary" data-action="open-edit-profile-modal">✏️ Edit Profile</button>
      <button class="btn-secondary" data-action="logout">Sign Out</button>
    </div>
  `;
}

export function openEditProfileForm() {
  const profile = state.currentUserProfile;
  if (!profile) return;
  document.getElementById("edit-profile-fullname").value = profile.fullName || "";
  document.getElementById("edit-profile-username").value = profile.username || "";
  document.getElementById("edit-profile-bio").value = profile.bio || "";
  openEditProfileModal();
}

export async function saveProfileEdits() {
  const user = auth.currentUser;
  if (!user) {
    showToast("You need to be signed in to update your profile.", "warning");
    return;
  }

  const fullName = document.getElementById("edit-profile-fullname").value.trim();
  const username = document.getElementById("edit-profile-username").value.trim();
  const bio = document.getElementById("edit-profile-bio").value.trim();

  if (!fullName || !username) {
    showToast("Full name and username can't be empty.", "warning");
    return;
  }

  try {
    await setDoc(doc(db, "users", user.uid), { fullName, username, bio }, { merge: true });
    state.currentUserProfile = { ...state.currentUserProfile, fullName, username, bio };
    document.getElementById("profile-role-str").innerText = state.currentUserIsAdmin ? "ADMIN CONSOLE" : "VERIFIED VIEWER";
    renderProfileView();
    closeEditProfileModal();
    showToast("Profile updated successfully.", "success");
  } catch (e) {
    showToast(`Couldn't update your profile: ${e.message}`, "error");
  }
}

export async function uploadProfileAvatar(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  const user = auth.currentUser;
  if (!user) {
    showToast("You need to be signed in to set a profile picture.", "warning");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("Profile pictures must be an image file.", "warning");
    inputEl.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Please choose an image smaller than 5MB.", "warning");
    inputEl.value = "";
    return;
  }

  showToast("Uploading your profile picture...", "warning", 2500);

  try {
    const { url } = await uploadToCloudinary(file, "image");
    await setDoc(doc(db, "users", user.uid), { avatarUrl: url }, { merge: true });
    state.currentUserProfile = { ...state.currentUserProfile, avatarUrl: url };
    renderProfileView();
    showToast("Profile picture updated.", "success");
  } catch (e) {
    showToast(`Couldn't upload your profile picture: ${e.message}`, "error");
  }
  inputEl.value = "";
}

export async function removeProfileAvatar() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(doc(db, "users", user.uid), { avatarUrl: "" }, { merge: true });
    state.currentUserProfile = { ...state.currentUserProfile, avatarUrl: "" };
    renderProfileView();
    showToast("Profile picture removed.", "success");
  } catch (e) {
    showToast(`Couldn't remove your profile picture: ${e.message}`, "error");
  }
}

export async function loadUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    state.currentUserProfile = snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error(e);
    state.currentUserProfile = null;
  }
  renderProfileView();
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
