// ============================================================================
// publish.js — publish/edit/delete entries, PDF attachment handling.
// ============================================================================

import { db, doc, addDoc, updateDoc, deleteDoc, getDoc, collection } from "./firebase.js";
import { uploadToCloudinary } from "./firebase.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";
import { closePublishModal, openPublishModal } from "./modals.js";
import { switchDashboardTab } from "./tabs.js";
import { fetchDatabaseEntries } from "./entries.js";
import { fetchAnalyticsMetrics } from "./admin.js";

export function setPublishMode(mode) {
  state.selectedPublishType = mode;
  const postTab = document.getElementById("tab-mode-post");
  const fileTab = document.getElementById("tab-mode-file");
  postTab.classList.toggle("active", mode === "post");
  fileTab.classList.toggle("active", mode === "file");
  postTab.setAttribute("aria-selected", String(mode === "post"));
  fileTab.setAttribute("aria-selected", String(mode === "file"));
  document.getElementById("group-content-text").classList.toggle("hidden", mode !== "post");
  document.getElementById("group-file-context").classList.toggle("hidden", mode !== "file");
}

export function resetPublishForm() {
  document.getElementById("pub-edit-id").value = "";
  document.getElementById("pub-title").value = "";
  document.getElementById("pub-category").value = "Philosophy";
  document.getElementById("pub-category-other").value = "";
  document.getElementById("pub-category-other").classList.add("hidden");
  document.getElementById("pub-content").innerHTML = "";
  document.getElementById("pub-file-path").value = "";
  document.getElementById("pub-file-name").value = "";
  document.getElementById("pub-pdf-title").value = "";
  document.getElementById("pub-pdf-notes").value = "";
  document.getElementById("file-upload-status").classList.add("hidden");
  document.getElementById("file-selected-display").classList.add("hidden");
  document.getElementById("media-upload-status").classList.add("hidden");
  document.getElementById("publish-modal-title").innerText = "Publish To Knowledge Hub";
  document.getElementById("publish-submit-btn").innerText = "Publish Asset";
  state.pendingUploadedFileMeta = null;
  setPublishMode("post");
}

export async function handleAttachmentUpload(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Only PDF files are supported for upload.", "warning");
    return;
  }

  const statusEl = document.getElementById("file-upload-status");
  statusEl.classList.remove("hidden");
  statusEl.innerText = `Uploading ${file.name}...`;

  try {
    const { url } = await uploadToCloudinary(file, "image");
    document.getElementById("pub-file-path").value = url;
    document.getElementById("pub-file-name").value = file.name;
    state.pendingUploadedFileMeta = { url, name: file.name };
    statusEl.innerText = `✓ Uploaded: ${file.name}`;
    document.getElementById("file-name-display").innerText = file.name;
    document.getElementById("file-selected-display").classList.remove("hidden");
    showToast(`${file.name} uploaded successfully.`, "success");
  } catch (e) {
    statusEl.innerText = "Upload failed: " + e.message;
    showToast(`Upload failed: ${e.message}`, "error");
  }
}

export function replaceFile() {
  document.getElementById("pub-file-input").click();
}

export function deleteSelectedFile() {
  document.getElementById("pub-file-path").value = "";
  document.getElementById("pub-file-name").value = "";
  document.getElementById("pub-file-input").value = "";
  document.getElementById("file-selected-display").classList.add("hidden");
  document.getElementById("file-upload-status").classList.add("hidden");
  state.pendingUploadedFileMeta = null;
}

export async function executePublishToCloud() {
  const editId = document.getElementById("pub-edit-id").value;
  const title = document.getElementById("pub-title").value.trim();
  const categorySelect = document.getElementById("pub-category").value;
  const category =
    categorySelect === "Other" ? document.getElementById("pub-category-other").value.trim() || "General" : categorySelect;
  const htmlContent = document.getElementById("pub-content").innerHTML.trim();
  const filePath = document.getElementById("pub-file-path").value.trim();
  const fileName = document.getElementById("pub-file-name").value.trim();
  const pdfTitle = document.getElementById("pub-pdf-title").value.trim();
  const pdfNotes = document.getElementById("pub-pdf-notes").value.trim();

  if (!title) {
    showToast("An entry title header is required.", "warning");
    return;
  }
  if (state.selectedPublishType === "file" && !filePath) {
    showToast("Please upload a PDF file before publishing.", "warning");
    return;
  }

  const payload = { title, category, type: state.selectedPublishType, timestamp: new Date().toISOString(), views: 0, downloads: 0 };
  if (state.selectedPublishType === "post") {
    payload.content = htmlContent || "<p>No abstract content.</p>";
  } else {
    payload.filePath = filePath;
    payload.fileName = fileName || filePath;
    payload.pdfTitle = pdfTitle || title;
    payload.pdfNotes = pdfNotes || "";
  }

  try {
    if (editId) {
      await updateDoc(doc(db, "notebook_entries", editId), payload);
      showToast("Entry updated successfully.", "success");
    } else {
      await addDoc(collection(db, "notebook_entries"), payload);
      showToast("Entry published successfully.", "success");
    }
    closePublishModal();
    fetchDatabaseEntries();
    fetchAnalyticsMetrics();
    resetPublishForm();
  } catch (e) {
    showToast(`Publish rejected: ${e.message}`, "error");
  }
}

export async function editEntry(id) {
  try {
    const snap = await getDoc(doc(db, "notebook_entries", id));
    if (!snap.exists()) {
      showToast("Entry not found.", "error");
      return;
    }
    const data = snap.data();
    openPublishModal();
    document.getElementById("pub-edit-id").value = id;
    document.getElementById("pub-title").value = data.title || "";
    document.getElementById("publish-modal-title").innerText = "Edit Existing Entry";
    document.getElementById("publish-submit-btn").innerText = "Save Changes";

    const knownCategories = ["Philosophy", "Physics", "Mathematics", "General"];
    if (knownCategories.includes(data.category)) {
      document.getElementById("pub-category").value = data.category;
      document.getElementById("pub-category-other").classList.add("hidden");
    } else {
      document.getElementById("pub-category").value = "Other";
      document.getElementById("pub-category-other").value = data.category || "";
      document.getElementById("pub-category-other").classList.remove("hidden");
    }

    setPublishMode(data.type);
    if (data.type === "post") {
      document.getElementById("pub-content").innerHTML = data.content || "";
    } else {
      document.getElementById("pub-file-path").value = data.filePath || "";
      document.getElementById("pub-file-name").value = data.fileName || "";
      document.getElementById("pub-pdf-title").value = data.pdfTitle || "";
      document.getElementById("pub-pdf-notes").value = data.pdfNotes || "";
      if (data.fileName) {
        document.getElementById("file-name-display").innerText = data.fileName;
        document.getElementById("file-selected-display").classList.remove("hidden");
      }
    }
  } catch (e) {
    showToast(`Could not load entry for editing: ${e.message}`, "error");
  }
}

export async function deleteEntry(id, title) {
  if (!window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "notebook_entries", id));
    switchDashboardTab("home");
    fetchDatabaseEntries();
    fetchAnalyticsMetrics();
    showToast(`"${title}" was deleted.`, "success");
  } catch (e) {
    showToast(`Delete failed: ${e.message}`, "error");
  }
}
