// ============================================================================
// admin.js — analytics counters and the registered-users admin table.
// ============================================================================

import { db, doc, getDoc, getDocs, collection } from "./firebase.js";

export async function fetchAnalyticsMetrics() {
  try {
    const snap = await getDoc(doc(db, "analytics", "global_metrics"));
    if (snap.exists()) {
      document.getElementById("stat-views-val").innerText = snap.data().views || 0;
      document.getElementById("stat-downloads-val").innerText = snap.data().total_downloads || 0;
    }
  } catch (e) {
    console.error(e);
  }
}

export async function renderAdminUserLedger() {
  const container = document.getElementById("admin-user-rows");
  if (!container) return;
  container.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "users"));
    let count = 0;
    snap.forEach((userNode) => {
      const data = userNode.data();
      const row = document.createElement("tr");
      const joinedDate = data.joined ? new Date(data.joined).toLocaleDateString() : "N/A";
      const contactLabel = data.contactMode === "phone" ? "📱 Phone" : "📧 Email";

      row.innerHTML = `
        <td>${escapeHTML(data.fullName || "N/A")}</td>
        <td class="col-username">@${escapeHTML(data.username || "N/A")}</td>
        <td>${contactLabel}</td>
        <td class="col-contact">${escapeHTML(data.contactValue || "N/A")}</td>
        <td class="col-joined">${joinedDate}</td>
      `;
      container.appendChild(row);
      count++;
    });
    document.getElementById("user-count-total").innerText = count;
  } catch (e) {
    console.error(e);
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
