// ============================================================================
// editor.js — rich text editor toolbar (bold/underline/italic/size,
// image/video embedding) for the publish modal.
// ============================================================================

import { uploadToCloudinary } from "./firebase.js";
import { showToast } from "./toast.js";

export function applyFormat(command, value = null) {
  document.getElementById("pub-content")?.focus();
  document.execCommand(command, false, value);
}

export function removeEmbeddedMedia(btnEl) {
  btnEl.closest(".embedded-media-wrapper")?.remove();
}

export async function insertMediaIntoEditor(inputEl, mediaKind) {
  const file = inputEl.files[0];
  if (!file) return;

  const statusEl = document.getElementById("media-upload-status");
  statusEl.classList.remove("hidden");
  statusEl.innerText = `Uploading ${mediaKind}... please wait.`;

  try {
    const { url } = await uploadToCloudinary(file, mediaKind === "image" ? "image" : "video");
    const innerTag =
      mediaKind === "image"
        ? `<img src="${url}" alt="${file.name}">`
        : `<video src="${url}" controls></video>`;
    const embedHTML = `<span class="embedded-media-wrapper" contenteditable="false">${innerTag}<button type="button" class="embedded-media-remove-btn" data-action="remove-embedded-media" title="Remove ${mediaKind}">&times;</button></span>&nbsp;`;

    document.getElementById("pub-content").focus();
    document.execCommand("insertHTML", false, embedHTML);
    statusEl.innerText = `${mediaKind === "image" ? "Image" : "Video"} inserted successfully.`;
    window.setTimeout(() => statusEl.classList.add("hidden"), 2500);
  } catch (e) {
    statusEl.innerText = "Upload failed: " + e.message;
    showToast(`Media upload failed: ${e.message}`, "error");
  }
  inputEl.value = "";
}
