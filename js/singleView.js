// ============================================================================
// singleView.js — the dedicated "reading page" for one article or PDF,
// including view/download counting, owner actions and the comments panel.
// ============================================================================

import { db, doc, updateDoc, increment } from "./firebase.js";
import { state } from "./state.js";
import { fetchCommentsForCard } from "./comments.js";
import { fetchAnalyticsMetrics } from "./admin.js";
import { openGateModal } from "./modals.js";

export async function openSingleView(id) {
  if (!state.currentUserIsAdmin) {
    try {
      await updateDoc(doc(db, "notebook_entries", id), { views: increment(1) });
      const entryIndex = state.allEntriesCache.findIndex((e) => e.id === id);
      if (entryIndex > -1) {
        state.allEntriesCache[entryIndex].data.views = (state.allEntriesCache[entryIndex].data.views || 0) + 1;
      }
    } catch (e) {
      /* view counting is best-effort */
    }
  }

  const entry = state.allEntriesCache.find((e) => e.id === id);
  if (!entry) return;

  document.querySelectorAll('main > div[id^="view-"]').forEach((v) => v.classList.add("hidden"));
  document.getElementById("view-single").classList.remove("hidden");

  const target = document.getElementById("single-content-hook");
  const data = entry.data;

  let mainContent = "";
  if (data.type === "file") {
    mainContent = `
      <h1 class="single-title">${data.pdfTitle || data.title}</h1>
      <div class="entry-stats-inline" style="margin-bottom: 20px;">👁 ${data.views || 0} Views | ⬇ ${
      data.downloads || 0
    } Downloads</div>
      <div style="background: var(--bg-main); padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 20px;">
        <span style="font-size: 2rem; display:block; margin-bottom:10px;" aria-hidden="true">📄</span>
        <p style="color:var(--text-main); font-size:1.05rem; margin-bottom:20px;">${data.pdfNotes || ""}</p>
        <button class="btn-primary" data-action="process-file-access" data-id="${id}">📥 View / Download PDF</button>
      </div>
    `;
  } else {
    mainContent = `
      <h1 class="single-title">${data.title}</h1>
      <div class="entry-stats-inline" style="margin-bottom: 20px;">👁 ${data.views || 0} Views</div>
      <div class="single-content">${data.content}</div>
      <div class="writer-signature">BY WAJID RIAZ</div>
    `;
  }

  const ownerButtons = state.currentUserIsAdmin
    ? `
    <div class="owner-actions">
      <button class="icon-action-btn" data-action="edit-entry" data-id="${id}">✏️ Edit</button>
      <button class="icon-action-btn danger" data-action="delete-entry" data-id="${id}" data-title="${(data.title || "").replace(
        /"/g,
        "&quot;"
      )}">🗑️ Delete</button>
    </div>`
    : "";

  const similar = state.allEntriesCache.filter((e) => e.data.type === data.type && e.id !== id).slice(0, 3);
  let similarHTML = "";
  if (similar.length > 0) {
    similarHTML = `
      <div style="margin-top: 50px; border-top: 1px solid var(--border-color); padding-top: 30px;">
        <h4 style="font-family: Georgia, serif; font-size: 1.2rem;">You may also like</h4>
        <div class="related-grid">
          ${similar
            .map(
              (s) => `
            <div class="entry-card related-grid-item" data-action="open-single" data-id="${s.id}">
              <strong>${s.data.title}</strong>
              <span>${s.data.type === "file" ? "PDF File" : "Article"}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  target.innerHTML = `
    ${mainContent}
    ${ownerButtons}

    <div class="comment-box-root" style="margin-top: 40px; border: 1px solid var(--border-color);">
      <h4 style="margin-bottom: 15px; font-family: Georgia, serif;">Discussion</h4>
      <div class="comment-stream" id="stream-hook-${id}">Loading comments...</div>
      <div class="comment-form">
        <label class="sr-only" for="comm-input-${id}">Add a comment</label>
        <input type="text" id="comm-input-${id}" placeholder="${
    state.userEmailSignature ? "Add a Comment..." : "Sign in to leave a comment"
  }" ${state.userEmailSignature ? "" : "disabled"}>
        <button class="btn-primary" style="padding: 6px 14px; font-size: 0.8rem;" data-action="submit-comment" data-id="${id}" ${
    state.userEmailSignature ? "" : "disabled"
  }>Post</button>
      </div>
    </div>

    ${similarHTML}
  `;

  fetchCommentsForCard(id);
  window.scrollTo(0, 0);
}

export async function processFileAccess(id) {
  const entryIndex = state.allEntriesCache.findIndex((e) => e.id === id);
  if (entryIndex === -1) return;
  const entry = state.allEntriesCache[entryIndex];

  if (!state.userEmailSignature) {
    openGateModal();
    return;
  }

  window.open(entry.data.filePath, "_blank");

  if (!state.currentUserIsAdmin) {
    try {
      await updateDoc(doc(db, "notebook_entries", id), { downloads: increment(1) });
      await updateDoc(doc(db, "analytics", "global_metrics"), { total_downloads: increment(1) });

      state.allEntriesCache[entryIndex].data.downloads = (state.allEntriesCache[entryIndex].data.downloads || 0) + 1;

      if (!document.getElementById("view-single").classList.contains("hidden")) {
        openSingleView(id);
      }
      fetchAnalyticsMetrics();
    } catch (e) {
      /* download counting is best-effort */
    }
  }
}
