// ============================================================
// Khởi tạo Firebase (App, Auth, Firestore) — dùng chung cho toàn bộ app
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, GoogleAuthProvider, signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, serverTimestamp, Timestamp, arrayUnion, arrayRemove, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from './firebase-config.js';
import { initEmail, sendOrderEmail, sendAdminNewListingEmail } from './email.js';

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

initEmail();

export { app, auth, db };
