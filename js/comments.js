// ============================================================================
// comments.js — fetch/post comments on an entry, with one level of
// Facebook-style threaded replies (reply to a comment, or reply to a reply —
// both attach to the same thread with an @mention tag).
// ============================================================================

import { db, collection, addDoc, query, orderBy, getDocs } from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCommentThread(entryId, root, replies) {
  const wrap = document.createElement("div");
  wrap.className = "comment-thread";

  const rootEl = document.createElement("div");
  rootEl.className = "comment-node";
  rootEl.innerHTML = `
    <strong>${escapeHTML(root.author)}</strong>
    <span class="comment-text">${escapeHTML(root.text)}</span>
    <div class="comment-meta-row">
      <span class="comment-time">${new Date(root.timestamp).toLocaleDateString()}</span>
      <button type="button" class="comment-reply-btn" data-action="toggle-reply-form" data-id="${entryId}" data-comment="${root.id}" data-mention="${escapeHTML(root.author)}">Reply</button>
    </div>
  `;
  wrap.appendChild(rootEl);

  if (replies.length) {
    const repliesWrap = document.createElement("div");
    repliesWrap.className = "comment-replies";
    replies.forEach((reply) => {
      const replyEl = document.createElement("div");
      replyEl.className = "comment-node comment-reply";
      replyEl.innerHTML = `
        <strong>${escapeHTML(reply.author)}</strong>
        ${reply.replyToAuthor ? `<span class="reply-to-tag">@${escapeHTML(reply.replyToAuthor)}</span>` : ""}
        <span class="comment-text">${escapeHTML(reply.text)}</span>
        <div class="comment-meta-row">
          <span class="comment-time">${new Date(reply.timestamp).toLocaleDateString()}</span>
          <button type="button" class="comment-reply-btn" data-action="toggle-reply-form" data-id="${entryId}" data-comment="${root.id}" data-mention="${escapeHTML(reply.author)}">Reply</button>
        </div>
      `;
      repliesWrap.appendChild(replyEl);
    });
    wrap.appendChild(repliesWrap);
  }

  const replyForm = document.createElement("div");
  replyForm.className = "reply-form hidden";
  replyForm.id = `reply-form-${root.id}`;
  replyForm.innerHTML = `
    <span class="reply-form-target" id="reply-target-${root.id}"></span>
    <div class="comment-form">
      <label class="sr-only" for="reply-input-${root.id}">Write a reply</label>
      <input type="text" id="reply-input-${root.id}" placeholder="Write a reply...">
      <button type="button" class="btn-primary" style="padding: 6px 14px; font-size: 0.8rem;" data-action="submit-reply" data-id="${entryId}" data-comment="${root.id}">Post</button>
    </div>
  `;
  wrap.appendChild(replyForm);

  return wrap;
}

export async function fetchCommentsForCard(id) {
  const zone = document.getElementById(`stream-hook-${id}`);
  if (!zone) return;
  zone.innerHTML = "";

  try {
    const q = query(collection(db, "notebook_entries", id, "comments"), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      zone.innerHTML = `<p style="font-size: 0.75rem; color: var(--text-muted);">No comments yet. Be the first to comment.</p>`;
      return;
    }

    const allComments = [];
    snap.forEach((commentDoc) => allComments.push({ id: commentDoc.id, ...commentDoc.data() }));

    const roots = allComments.filter((c) => !c.parentId);
    const repliesByParent = {};
    allComments
      .filter((c) => c.parentId)
      .forEach((c) => {
        (repliesByParent[c.parentId] ||= []).push(c);
      });

    roots.forEach((root) => {
      zone.appendChild(buildCommentThread(id, root, repliesByParent[root.id] || []));
    });
  } catch (e) {
    console.error(e);
  }
}

export async function submitCommentNode(id) {
  const input = document.getElementById(`comm-input-${id}`);
  const msg = input.value.trim();
  if (!msg) return;

  if (!state.userEmailSignature) {
    showToast("Please sign in to leave a comment.", "warning");
    return;
  }

  try {
    await addDoc(collection(db, "notebook_entries", id, "comments"), {
      author: state.userEmailSignature.split("@")[0],
      text: msg,
      parentId: null,
      replyToAuthor: null,
      timestamp: new Date().toISOString(),
    });
    input.value = "";
    fetchCommentsForCard(id);
  } catch (e) {
    showToast(`Couldn't post your comment: ${e.message}`, "error");
  }
}

/**
 * Shows/hides the (single, shared) reply box for a comment thread, and
 * labels it with whichever specific author was clicked — so replying to a
 * reply still attaches to the same thread but visibly @mentions that person,
 * the same way Facebook comment threads behave.
 */
export function toggleReplyForm(entryId, rootCommentId, mentionAuthor) {
  document.querySelectorAll(".reply-form:not(.hidden)").forEach((openForm) => {
    if (openForm.id !== `reply-form-${rootCommentId}`) openForm.classList.add("hidden");
  });

  const form = document.getElementById(`reply-form-${rootCommentId}`);
  if (!form) return;

  const wasHidden = form.classList.contains("hidden");
  if (wasHidden) {
    form.classList.remove("hidden");
    form.dataset.mention = mentionAuthor || "";
    const targetLabel = document.getElementById(`reply-target-${rootCommentId}`);
    if (targetLabel) targetLabel.innerText = mentionAuthor ? `Replying to @${mentionAuthor}` : "";
    document.getElementById(`reply-input-${rootCommentId}`)?.focus();
  } else {
    form.classList.add("hidden");
  }
}

export async function submitReply(entryId, rootCommentId) {
  const input = document.getElementById(`reply-input-${rootCommentId}`);
  const text = input.value.trim();
  if (!text) return;

  if (!state.userEmailSignature) {
    showToast("Please sign in to reply.", "warning");
    return;
  }

  const form = document.getElementById(`reply-form-${rootCommentId}`);
  const mentionAuthor = form?.dataset.mention || null;

  try {
    await addDoc(collection(db, "notebook_entries", entryId, "comments"), {
      author: state.userEmailSignature.split("@")[0],
      text,
      parentId: rootCommentId,
      replyToAuthor: mentionAuthor || null,
      timestamp: new Date().toISOString(),
    });
    input.value = "";
    form.classList.add("hidden");
    fetchCommentsForCard(entryId);
  } catch (e) {
    showToast(`Couldn't post your reply: ${e.message}`, "error");
  }
}
