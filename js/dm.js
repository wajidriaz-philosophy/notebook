// ============================================================================
// dm.js — "Message Admin" direct-message threads. Every signed-in viewer
// gets one private thread with the admin (keyed by their own uid). Only the
// admin console can see the list of every thread; a regular viewer only
// ever sees their own.
// ============================================================================

import { auth, db, doc, setDoc, getDocs, addDoc, collection, query, orderBy } from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";
import { openGateModal, showDMModal, closeDMModal as hideDMModal } from "./modals.js";

const ADMIN_DISPLAY_NAME = "Wajid Riaz";

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const closeDMModal = hideDMModal;

async function renderDMMessages(uid) {
  const stream = document.getElementById("dm-message-stream");
  if (!stream) return;
  stream.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Loading conversation...</p>`;

  try {
    const q = query(collection(db, "dm_threads", uid, "messages"), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      stream.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No messages yet — say hello!</p>`;
      return;
    }

    stream.innerHTML = "";
    snap.forEach((messageDoc) => {
      const data = messageDoc.data();
      const bubble = document.createElement("div");
      bubble.className = `dm-bubble dm-bubble--${data.senderRole === "admin" ? "admin" : "user"}`;
      bubble.innerHTML = `
        <div class="dm-bubble-author">${escapeHTML(data.senderName)}</div>
        <div class="dm-bubble-text">${escapeHTML(data.text)}</div>
        <div class="dm-bubble-time">${new Date(data.timestamp).toLocaleString()}</div>
      `;
      stream.appendChild(bubble);
    });
    stream.scrollTop = stream.scrollHeight;
  } catch (e) {
    stream.innerHTML = `<p style="color: var(--error-red); font-size: 0.85rem;">Couldn't load this conversation.</p>`;
  }
}

/**
 * Entry point for a regular viewer clicking "Message Admin" in the identity
 * popover. Opens (or creates) their own private thread with the admin.
 */
export async function openDMModal() {
  const user = auth.currentUser;
  if (!user) {
    openGateModal();
    return;
  }

  state.activeDMThreadUid = user.uid;
  state.dmAsAdmin = false;

  document.getElementById("dm-modal-title").innerText = `Message ${ADMIN_DISPLAY_NAME}`;
  document.getElementById("dm-message-input").placeholder = "Type your message...";
  showDMModal();
  await renderDMMessages(user.uid);

  try {
    await setDoc(doc(db, "dm_threads", user.uid), { hasUnreadForUser: false }, { merge: true });
  } catch (e) {
    /* best-effort read receipt */
  }
}

/**
 * Entry point for the admin opening a specific viewer's thread from the
 * admin console's "Direct Messages" list.
 */
export async function openAdminDMThread(uid, userName) {
  state.activeDMThreadUid = uid;
  state.dmAsAdmin = true;

  document.getElementById("dm-modal-title").innerText = `Conversation with ${userName || "Viewer"}`;
  document.getElementById("dm-message-input").placeholder = `Reply to ${userName || "this viewer"}...`;
  showDMModal();
  await renderDMMessages(uid);

  try {
    await setDoc(doc(db, "dm_threads", uid), { hasUnreadForAdmin: false }, { merge: true });
    renderAdminDMThreadList();
  } catch (e) {
    /* best-effort read receipt */
  }
}

export async function sendDMMessage() {
  const input = document.getElementById("dm-message-input");
  const text = input.value.trim();
  if (!text) return;

  const uid = state.activeDMThreadUid;
  const user = auth.currentUser;
  if (!uid || !user) {
    openGateModal();
    return;
  }

  const senderRole = state.dmAsAdmin ? "admin" : "user";
  const senderName = state.dmAsAdmin ? ADMIN_DISPLAY_NAME : state.currentUserProfile?.fullName || user.email;

  try {
    await addDoc(collection(db, "dm_threads", uid, "messages"), {
      senderRole,
      senderName,
      text,
      timestamp: new Date().toISOString(),
    });

    const threadMeta = { lastMessage: text, lastMessageAt: new Date().toISOString() };
    if (senderRole === "user") {
      threadMeta.userName = state.currentUserProfile?.fullName || "Unknown Viewer";
      threadMeta.username = state.currentUserProfile?.username || "user";
      threadMeta.hasUnreadForAdmin = true;
    } else {
      threadMeta.hasUnreadForUser = true;
    }
    await setDoc(doc(db, "dm_threads", uid), threadMeta, { merge: true });

    input.value = "";
    renderDMMessages(uid);
    if (state.dmAsAdmin) renderAdminDMThreadList();
  } catch (e) {
    showToast(`Couldn't send your message: ${e.message}`, "error");
  }
}

/**
 * Admin-only: lists every viewer's DM thread, most recently active first,
 * with an unread indicator. Clicking a row opens the full conversation.
 */
export async function renderAdminDMThreadList() {
  const container = document.getElementById("admin-dm-thread-rows");
  if (!container) return;
  container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Loading conversations...</p>`;

  try {
    const q = query(collection(db, "dm_threads"), orderBy("lastMessageAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No messages from viewers yet.</p>`;
      return;
    }

    container.innerHTML = "";
    snap.forEach((threadDoc) => {
      const data = threadDoc.data();
      const row = document.createElement("button");
      row.type = "button";
      row.className = "dm-thread-row";
      row.dataset.action = "open-admin-dm-thread";
      row.dataset.uid = threadDoc.id;
      row.dataset.username = data.userName || "Unknown Viewer";
      row.innerHTML = `
        <div class="dm-thread-row-head">
          <strong>${escapeHTML(data.userName || "Unknown Viewer")}</strong>
          ${data.hasUnreadForAdmin ? `<span class="dm-unread-dot" title="Unread message" aria-label="Unread"></span>` : ""}
        </div>
        <p class="dm-thread-preview">${escapeHTML(data.lastMessage || "")}</p>
        <span class="dm-thread-time">${data.lastMessageAt ? new Date(data.lastMessageAt).toLocaleString() : ""}</span>
      `;
      container.appendChild(row);
    });
  } catch (e) {
    container.innerHTML = `<p style="color: var(--error-red); font-size: 0.9rem;">Couldn't load conversations.</p>`;
  }
}
