// ============================================================================
// theme.js — theme switching with localStorage persistence (new feature).
// The user's chosen theme (light/charcoal/night) is restored automatically
// the next time they load the page.
// ============================================================================

const THEMES = ["light", "charcoal", "night"];
const STORAGE_KEY = "notebook_theme";

export function setTheme(themeName, { persist = true } = {}) {
  const theme = THEMES.includes(themeName) ? themeName : "light";
  document.documentElement.setAttribute("data-theme", theme);

  THEMES.forEach((t) => {
    const btn = document.getElementById(`th-${t}`);
    if (btn) {
      btn.classList.toggle("active", t === theme);
      btn.setAttribute("aria-pressed", String(t === theme));
    }
  });

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage may be unavailable (private browsing, quota, etc.) —
      // theme switching still works for the current session.
    }
  }
}

export function initTheme() {
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY) || "light";
  } catch (e) {
    savedTheme = "light";
  }
  setTheme(savedTheme, { persist: false });
}
