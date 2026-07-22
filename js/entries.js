// ============================================================================
// entries.js — loads notebook entries from Firestore and renders the
// home/library/articles/pdfs feeds.
// ============================================================================

import { db, collection, getDocs, query, orderBy } from "./firebase.js";
import { state } from "./state.js";

export async function fetchDatabaseEntries() {
  try {
    const q = query(collection(db, "notebook_entries"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    state.allEntriesCache = [];
    snap.forEach((entryNode) => state.allEntriesCache.push({ id: entryNode.id, data: entryNode.data() }));

    document.getElementById("stat-posts-val").innerText = state.allEntriesCache.length;
    document.getElementById("library-count-badge").innerText = state.allEntriesCache.length;

    populateCategoryFilter();
    renderFeeds();
  } catch (e) {
    console.error(e);
  }
}

export function populateCategoryFilter() {
  const select = document.getElementById("library-category-filter");
  if (!select) return;
  const existingSelection = select.value || "all";
  const categories = [...new Set(state.allEntriesCache.map((e) => e.data.category).filter(Boolean))];
  select.innerHTML =
    `<option value="all">All Categories</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.value = categories.includes(existingSelection) ? existingSelection : "all";
}

export function renderFeeds() {
  const homeTarget = document.getElementById("featured-feed-hook");
  homeTarget.innerHTML = "";
  state.allEntriesCache.slice(0, 5).forEach((e) => homeTarget.appendChild(createSummaryCard(e.id, e.data)));

  const artTarget = document.getElementById("articles-feed-hook");
  artTarget.innerHTML = "";
  const articles = state.allEntriesCache.filter((e) => e.data.type === "post");
  if (articles.length === 0) artTarget.innerHTML = `<p style="color: var(--text-muted)">No articles available.</p>`;
  articles.forEach((e) => artTarget.appendChild(createSummaryCard(e.id, e.data)));

  const pdfTarget = document.getElementById("pdfs-feed-hook");
  pdfTarget.innerHTML = "";
  const pdfs = state.allEntriesCache.filter((e) => e.data.type === "file");
  if (pdfs.length === 0) pdfTarget.innerHTML = `<p style="color: var(--text-muted)">No files available.</p>`;
  pdfs.forEach((e) => pdfTarget.appendChild(createSummaryCard(e.id, e.data)));

  renderLibraryFeed();
}

export function renderLibraryFeed() {
  const target = document.getElementById("extended-library-hook");
  const filterVal = document.getElementById("library-category-filter").value;
  target.innerHTML = "";
  const filtered =
    filterVal === "all" ? state.allEntriesCache : state.allEntriesCache.filter((e) => e.data.category === filterVal);

  if (filtered.length === 0) {
    target.innerHTML = `<p style="color: var(--text-muted)">No items match this category.</p>`;
    return;
  }
  filtered.forEach((e) => target.appendChild(createSummaryCard(e.id, e.data)));
}

// Creates the minimal summary card used in every feed (no comments shown here)
export function createSummaryCard(id, data) {
  const el = document.createElement("article");
  el.className = "entry-card";

  const v = data.views || 0;
  const d = data.downloads || 0;
  const statHTML = data.type === "file" ? `👁 ${v} Views | ⬇ ${d} Downloads` : `👁 ${v} Views`;

  let snippetHTML = "";
  if (data.type === "file") {
    snippetHTML = `
      <div class="entry-file-preview">
        <span class="file-icon" aria-hidden="true">📄</span>
        <div>
          <div class="file-title">${data.pdfTitle || data.fileName || "PDF Document"}</div>
          ${data.pdfNotes ? `<div class="file-notes">${data.pdfNotes.substring(0, 80)}...</div>` : ""}
        </div>
      </div>
    `;
  } else {
    const rawText = data.content.replace(/<[^>]+>/g, " ");
    const shortText = rawText.length > 150 ? rawText.substring(0, 150) + "..." : rawText;
    snippetHTML = `
      <div class="entry-meta-badge" style="margin-top:10px;">📝 ARTICLE</div>
      <div class="rendered-essay-body">${shortText}</div>
    `;
  }

  el.innerHTML = `
    <div class="entry-card-head">
      <h4>${data.title}${data.category ? `<span class="category-badge">${data.category}</span>` : ""}</h4>
      <div class="entry-stats-inline">${statHTML}</div>
    </div>
    ${snippetHTML}
    <div style="margin-top:15px;">
      <button class="read-more-toggle-btn" data-action="open-single" data-id="${id}">${
    data.type === "file" ? "View PDF Details ▾" : "Read More ▾"
  }</button>
    </div>
  `;
  return el;
}
