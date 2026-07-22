// ============================================================================
// main.js — application bootstrap. Wires every interactive control via
// addEventListener (no inline onclick anywhere) using event delegation for
// anything rendered dynamically (feed cards, comments, admin rows, etc.).
// ============================================================================

import { initTheme, setTheme } from "./theme.js";
import { initSidebar, toggleSidebar } from "./sidebar.js";
import { switchDashboardTab } from "./tabs.js";
import {
  openPublishModal,
  closePublishModal,
  openAuthModal,
  closeAuthModal,
  openGateModal,
  closeGateModal,
  openEditProfileModal,
  closeEditProfileModal,
  toggleIdentityPopover,
  initIdentityPopover,
} from "./modals.js";
import { applyFormat, insertMediaIntoEditor, removeEmbeddedMedia } from "./editor.js";
import {
  setPublishMode,
  resetPublishForm,
  handleAttachmentUpload,
  replaceFile,
  deleteSelectedFile,
  executePublishToCloud,
  editEntry,
  deleteEntry,
} from "./publish.js";
import { renderLibraryFeed, fetchDatabaseEntries } from "./entries.js";
import { openSingleView, processFileAccess, printCurrentEntry, copyEntryLink, initHashRouting, routeFromHash } from "./singleView.js";
import { submitCommentNode } from "./comments.js";
import {
  setContactMode,
  toggleAuthMode,
  executeLoginWorkflow,
  executeRegistrationWorkflow,
  verifyRegistrationOTP,
  executeLogoutWorkflow,
  initAuthStateListener,
} from "./auth.js";
import { openEditProfileForm, saveProfileEdits, uploadProfileAvatar, removeProfileAvatar } from "./profile.js";
import { fetchAnalyticsMetrics } from "./admin.js";

// ----------------------------------------------------------------------------
// Delegated click handler — a single listener handles every [data-action]
// element on the page, including ones created later via innerHTML.
// ----------------------------------------------------------------------------
const ACTIONS = {
  "toggle-sidebar": () => toggleSidebar(),
  "switch-tab": (el) => switchDashboardTab(el.dataset.tab),
  "toggle-identity-popover": (el, event) => toggleIdentityPopover(event),
  "open-auth-modal": () => openAuthModal(),
  "close-auth-modal": () => closeAuthModal(),
  "open-publish-modal": () => {
    resetPublishForm();
    openPublishModal();
  },
  "close-publish-modal": () => closePublishModal(),
  "close-gate-modal": () => closeGateModal(),
  "open-gate-login": () => {
    closeGateModal();
    toggleAuthMode("login");
    openAuthModal();
  },
  "open-gate-signup": () => {
    closeGateModal();
    toggleAuthMode("signup");
    openAuthModal();
  },
  "set-theme": (el) => setTheme(el.dataset.theme),
  "set-publish-mode": (el) => setPublishMode(el.dataset.mode),
  "set-contact-mode": (el) => setContactMode(el.dataset.mode),
  "toggle-auth-mode": (el) => toggleAuthMode(el.dataset.mode),
  login: () => executeLoginWorkflow(),
  register: () => executeRegistrationWorkflow(),
  "verify-otp": () => verifyRegistrationOTP(),
  logout: () => executeLogoutWorkflow(),
  "apply-format": (el) => applyFormat(el.dataset.command, el.dataset.value || null),
  "trigger-file-input": (el) => document.getElementById(el.dataset.target)?.click(),
  "replace-file": () => replaceFile(),
  "delete-file": () => deleteSelectedFile(),
  "publish-entry": () => executePublishToCloud(),
  "edit-entry": (el) => editEntry(el.dataset.id),
  "delete-entry": (el) => deleteEntry(el.dataset.id, el.dataset.title),
  "open-single": (el) => openSingleView(el.dataset.id),
  "back-to-hub": () => switchDashboardTab("home"),
  "process-file-access": (el) => processFileAccess(el.dataset.id),
  "print-entry": () => printCurrentEntry(),
  "copy-entry-link": (el) => copyEntryLink(el.dataset.id),
  "submit-comment": (el) => submitCommentNode(el.dataset.id),
  "remove-embedded-media": (el) => removeEmbeddedMedia(el),
  "open-edit-profile-modal": () => openEditProfileForm(),
  "close-edit-profile-modal": () => closeEditProfileModal(),
  "save-profile": () => saveProfileEdits(),
  "remove-profile-avatar": () => removeProfileAvatar(),
};

function initDelegatedActions() {
  document.body.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const handler = ACTIONS[el.dataset.action];
    if (handler) handler(el, event);
  });
}

// ----------------------------------------------------------------------------
// Static form control wiring (elements that always exist in the DOM)
// ----------------------------------------------------------------------------
function initFormControls() {
  document.getElementById("pub-category")?.addEventListener("change", (e) => {
    document.getElementById("pub-category-other").classList.toggle("hidden", e.target.value !== "Other");
  });

  document.getElementById("library-category-filter")?.addEventListener("change", () => renderLibraryFeed());

  document.getElementById("pub-image-input")?.addEventListener("change", (e) => insertMediaIntoEditor(e.target, "image"));
  document.getElementById("pub-video-input")?.addEventListener("change", (e) => insertMediaIntoEditor(e.target, "video"));
  document.getElementById("pub-file-input")?.addEventListener("change", (e) => handleAttachmentUpload(e.target));
  document.getElementById("profile-avatar-input")?.addEventListener("change", (e) => uploadProfileAvatar(e.target));

  document.getElementById("editor-font-size")?.addEventListener("change", (e) => {
    if (e.target.value) applyFormat("fontSize", e.target.value);
  });

  // Enter key submits a comment from its input field.
  document.getElementById("view-single")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches('input[id^="comm-input-"]')) {
      const id = e.target.id.replace("comm-input-", "");
      submitCommentNode(id);
    }
  });
}

// ----------------------------------------------------------------------------
// Bootstrap
// ----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initSidebar();
  initIdentityPopover();
  initDelegatedActions();
  initFormControls();
  initHashRouting();
  initAuthStateListener();

  await fetchDatabaseEntries();
  fetchAnalyticsMetrics();
  routeFromHash();
});
