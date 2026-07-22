// ============================================================================
// sidebar.js — sidebar open/close behavior (GPU-accelerated transform,
// see css/sidebar.css). No inline onclick — wired via addEventListener.
// ============================================================================

export function openSidebar() {
  document.getElementById("app-sidebar-node")?.classList.add("active");
  document.body.classList.add("sidebar-open");
}

export function closeSidebar() {
  document.getElementById("app-sidebar-node")?.classList.remove("active");
  document.body.classList.remove("sidebar-open");
}

export function toggleSidebar() {
  const sidebar = document.getElementById("app-sidebar-node");
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle("active");
  document.body.classList.toggle("sidebar-open", isOpen);
}

export function initSidebar() {
  const sidebarNode = document.getElementById("app-sidebar-node");
  const backdrop = document.getElementById("sidebar-backdrop");

  document.addEventListener("click", (event) => {
    if (!sidebarNode) return;
    const clickedToggle = event.target.closest('[data-action="toggle-sidebar"]');
    if (clickedToggle) return; // handled by the delegated action handler
    const clickedInsideSidebar = sidebarNode.contains(event.target);
    if (!clickedInsideSidebar && sidebarNode.classList.contains("active")) {
      closeSidebar();
    }
  });

  backdrop?.addEventListener("click", closeSidebar);
}
