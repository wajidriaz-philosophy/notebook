// ============================================================================
// firebase.js — Firebase app/auth/firestore initialization and Cloudinary
// upload helper. Every other module imports its Firebase handles from here
// instead of re-initializing the SDK.
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CLOUDINARY_CLOUD_NAME = "vwcfgbh9";
const CLOUDINARY_UPLOAD_PRESET = "notebook_unsigned";

const firebaseConfig = {
  apiKey: "AIzaSyC326Wflij1c_pja2MRVEA_6Eg-pppJb5I",
  authDomain: "wajid-philodophy.firebaseapp.com",
  projectId: "wajid-philodophy",
  storageBucket: "wajid-philodophy.firebasestorage.app",
  messagingSenderId: "16835513128",
  appId: "1:16835513128:web:97989ee0844a41f59c1e1d",
  measurementId: "G-VXMK8P2EMK",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function uploadToCloudinary(file, resourceType = "auto") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Cloudinary upload failed.");
  return { url: result.secure_url, publicId: result.public_id };
}

export {
  auth,
  db,
  uploadToCloudinary,
  // re-exported firestore/auth helpers so other modules don't need their own
  // long import lines to the gstatic CDN
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  increment,
};
