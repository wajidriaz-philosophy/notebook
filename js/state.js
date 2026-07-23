// ============================================================================
// state.js — single shared mutable state object.
// Keeping this in one place (instead of scattered module-level `let`s that
// modules poke at each other) makes the data flow easy to trace.
// ============================================================================

export const state = {
  activeAuthMode: "login",
  activeContactMode: "email",
  generatedOTP: null,
  cachedRegDetails: null,
  userEmailSignature: null,
  currentUserProfile: null, // { fullName, username, contactMode, contactValue, email, joined, bio }
  currentUserIsAdmin: false,
  selectedPublishType: "post",
  allEntriesCache: [],
  pendingUploadedFileMeta: null,
  hasCountedGlobalView: false,
  activeDMThreadUid: null,
  dmAsAdmin: false,
};
