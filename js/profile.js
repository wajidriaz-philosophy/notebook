// ============================================================================
// profile.js — the user profile page shown after sign up / login.
// Displays account details + bio, lets the user edit their name/username/bio,
// and (for admins) links back to the admin console.
// ============================================================================

import { auth, db, doc, getDoc, setDoc } from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";
import { closeEditProfileModal, openEditProfileModal } from "./modals.js";

function initialsFromName(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
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
  const publishedCount = state.currentUserIsAdmin
    ? state.allEntriesCache.length
    : 0;
  const roleLabel = state.currentUserIsAdmin ? "Admin" : "Verified Viewer";

  root.innerHTML = `
    <div class="profile-page-header">
      <div class="avatar avatar-lg" aria-hidden="true">${initialsFromName(profile.fullName)}</div>
      <div class="profile-name-block">
        <h2>${escapeHTML(profile.fullName || "Unnamed User")}</h2>
        <div class="username">@${escapeHTML(profile.username || "user")}</div>
        <span class="profile-role-pill">${roleLabel}</span>
      </div>
    </div>

    <div class="profile-grid">
      <div class="profile-stat-card">
        <h3>${publishedCount}</h3>
        <p>Published Entries</p>
      </div>
      <div class="profile-stat-card">
        <h3>${joinedDate}</h3>
        <p>Member Since</p>
      </div>
      <div class="profile-stat-card">
        <h3>${roleLabel}</h3>
        <p>Account Role</p>
      </div>
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
