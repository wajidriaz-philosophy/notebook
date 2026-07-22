// ============================================================================
// comments.js — fetch and post comments on an entry.
// ============================================================================

import { db, collection, addDoc, query, orderBy, getDocs } from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";

export async function fetchCommentsForCard(id) {
  const zone = document.getElementById(`stream-hook-${id}`);
  if (!zone) return;
  zone.innerHTML = "";

  try {
    const q = query(collection(db, "notebook_entries", id, "comments"), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      zone.innerHTML = `<p style="font-size: 0.75rem; color: var(--text-muted);">No comments yet.</p>`;
      return;
    }
    snap.forEach((comment) => {
      const cData = comment.data();
      const node = document.createElement("div");
      node.className = "comment-node";
      const author = document.createElement("strong");
      author.textContent = cData.author;
      node.appendChild(author);
      node.append(`: ${cData.text} `);
      const time = document.createElement("span");
      time.textContent = new Date(cData.timestamp).toLocaleDateString();
      node.appendChild(time);
      zone.appendChild(node);
    });
  } catch (e) {
    // Comment stream is non-critical; fail silently in the UI, log for devs.
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
      timestamp: new Date().toISOString(),
    });
    input.value = "";
    fetchCommentsForCard(id);
  } catch (e) {
    showToast(`Couldn't post your comment: ${e.message}`, "error");
  }
}
