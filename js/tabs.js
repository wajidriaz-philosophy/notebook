// ============================================================================
// tabs.js — dashboard tab switching (home / library / articles / pdfs /
// admin / profile / single).
// ============================================================================

import { closeSidebar } from "./sidebar.js";

const TAB_NAMES = ["home", "library", "articles", "pdfs", "admin", "profile", "single"];

export function switchDashboardTab(targetTab) {
  TAB_NAMES.forEach((tab) => {
    document.getElementById(`view-${tab}`)?.classList.add("hidden");
    document.getElementById(`tab-${tab}`)?.classList.remove("active");
  });

  document.getElementById(`view-${targetTab}`)?.classList.remove("hidden");
  document.getElementById(`tab-${targetTab}`)?.classList.add("active");

  closeSidebar();
  window.scrollTo(0, 0);
}
