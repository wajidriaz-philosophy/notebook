// ============================================================================
// singleView.js — Manages rendering individual articles and PDFs/ebooks
// ============================================================================

import { showToast } from "./toast.js";

// Global cache or lookup mechanism for entries (assumes entries are stored or fetched)
let currentEntriesCache = [];

export function setEntriesCache(entries) {
  currentEntriesCache = entries;
}

export function openSingleView(entryId) {
  // 1. Find the entry by ID from your active application state/cache
  const entry = currentEntriesCache.find(e => String(e.id) === String(entryId)) || window.allEntriesCache?.find(e => String(e.id) === String(entryId));
  
  if (!entry) {
    showToast("Could not load the requested entry.", "error");
    return;
  }

  // 2. Hide all dashboard and list views
  const views = ['view-home', 'view-library', 'view-articles', 'view-pdfs', 'view-profile', 'view-admin'];
  views.forEach(viewId => {
    const el = document.getElementById(viewId);
    if (el) el.classList.add('hidden');
  });

  // 3. Reveal the single view section
  const singleView = document.getElementById('view-single');
  if (singleView) singleView.classList.remove('hidden');

  // 4. Inject content into the single view hook
  const contentHook = document.getElementById('single-content-hook');
  if (contentHook) {
    contentHook.innerHTML = `
      <div class="single-article-header">
        <h2>${entry.title || 'Untitled Entry'}</h2>
        <div class="entry-meta-bar" style="color: var(--text-muted); margin: 10px 0 20px 0; font-size: 0.9rem;">
          <span>Category: <strong>${entry.category || 'General'}</strong></span> &bull; 
          <span>Type: <strong>${entry.type === 'file' ? 'Ebook / PDF' : 'Article'}</strong></span>
        </div>
      </div>
      <div class="single-article-body">
        ${entry.content || entry.notes || entry.description || 'No textual content provided.'}
      </div>
    `;
  }

  // 5. Handle Action Bar (Download & Discussions) for PDFs, Ebooks, and Articles
  const actionBar = document.getElementById('single-action-bar');
  if (actionBar) {
    // Show action bar for both files and articles so users can discuss or download if available
    actionBar.classList.remove('hidden');

    const downloadBtn = document.getElementById('btn-download');
    const discussBtn = document.getElementById('btn-discuss');

    // Configure Download Button
    if (downloadBtn) {
      if (entry.filePath || entry.fileUrl) {
        downloadBtn.style.display = 'inline-block';
        downloadBtn.onclick = () => {
          const fileLink = entry.filePath || entry.fileUrl;
          const link = document.createElement('a');
          link.href = fileLink;
          link.download = entry.fileName || 'document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast("Downloading file...", "success");
        };
      } else {
        // Hide download button if it's a pure text article with no file attachment
        downloadBtn.style.display = 'none';
      }
    }

    // Configure Discussion Button
    if (discussBtn) {
      discussBtn.onclick = () => {
        showToast("Opening discussion thread...", "success");
        // Scroll down to comments section if present
        const commentSection = document.getElementById(`comments-section-${entryId}`) || document.getElementById('discussion-section-hook');
        if (commentSection) {
          commentSection.scrollIntoView({ behavior: 'smooth' });
        }
      };
    }
  }

  // 6. Scroll smoothly to the top of the page
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function processFileAccess(entryId) {
  openSingleView(entryId);
}
