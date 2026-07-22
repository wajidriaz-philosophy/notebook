// ============================================================================
// toast.js — lightweight toast notification system.
// Replaces every alert() in the app with a non-blocking, auto-dismissing
// notification in the bottom-right corner. Three types: success/error/warning.
// ============================================================================

const ICONS = {
  success: "✓",
  error: "✕",
  warning: "⚠",
};

const AUTO_DISMISS_MS = 4000;

function getContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("role", "status");
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification.
 * @param {string} message - text to display
 * @param {'success'|'error'|'warning'} [type='success']
 * @param {number} [duration=4000] - ms before auto-dismiss
 */
export function showToast(message, type = "success", duration = AUTO_DISMISS_MS) {
  const container = getContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = ICONS[type] || ICONS.success;

  const messageEl = document.createElement("span");
  messageEl.className = "toast-message";
  messageEl.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.textContent = "×";

  const dismiss = () => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };

  closeBtn.addEventListener("click", dismiss);

  toast.append(icon, messageEl, closeBtn);
  container.appendChild(toast);

  window.setTimeout(dismiss, duration);
}
