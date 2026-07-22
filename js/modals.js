// ============================================================================
// modals.js — open/close helpers for the publish, auth, gate and
// edit-profile modal overlays, plus the sidebar identity popover.
// ============================================================================

function open(id) {
  document.getElementById(id)?.classList.add("active");
}
function close(id) {
  document.getElementById(id)?.classList.remove("active");
}

export const openPublishModal = () => open("modal-publish");
export const closePublishModal = () => close("modal-publish");
export const openAuthModal = () => open("modal-auth");
export const closeAuthModal = () => close("modal-auth");
export const openGateModal = () => open("modal-gate");
export const closeGateModal = () => close("modal-gate");
export const openEditProfileModal = () => open("modal-edit-profile");
export const closeEditProfileModal = () => close("modal-edit-profile");

export function toggleIdentityPopover(event) {
  event.stopPropagation();
  document.getElementById("identity-popover-card")?.classList.toggle("active");
}

export function initIdentityPopover() {
  document.addEventListener("click", () => {
    document.getElementById("identity-popover-card")?.classList.remove("active");
  });
}
