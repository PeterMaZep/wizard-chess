import {initializeApp} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {getAuth, GoogleAuthProvider, EmailAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithPopup, linkWithCredential, signOut, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, limit, onSnapshot, runTransaction} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwnlv0WaRXSDbAJOdkt9mUOnVAYpx7jfA",
  authDomain: "wizzezz.firebaseapp.com",
  projectId: "wizzezz",
  storageBucket: "wizzezz.firebasestorage.app",
  messagingSenderId: "403899957478",
  appId: "1:403899957478:web:0ad61cb81f7ae712183b27"
};

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6Lc_jxwuAAAAAOi0O6kt0Yumo-YmBy3PGM81TT5u"),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
window.fb = {app, auth, db, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, limit, onSnapshot, runTransaction};
window.dispatchEvent(new Event('fb-ready'));

let uid = null;

async function pushRating(r) {
  if (!uid) return;
  try {
    await setDoc(doc(db, "users", uid), {elo: r.elo, games: r.games.slice(-50)}, {merge: true});
  } catch (e) {
    console.error("Could not save rating", e);
  }
}

window.addEventListener("account-push", e => pushRating(e.detail));

function emitState(user) {
  uid = user ? user.uid : null;
  const detail = user ? {
    name: user.displayName || user.email || "Player",
    email: user.email || "",
    hasPassword: user.providerData.some(p => p.providerId == "password"),
    hasGoogle: user.providerData.some(p => p.providerId == "google.com")
  } : null;
  window.dispatchEvent(new CustomEvent("account-state", {detail}));
}

const MESSAGES = {
  "auth/email-already-in-use": "That email already has an account. Log in instead, or sign in with Google.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/weak-password": "Use at least 6 characters for the password.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/missing-password": "Enter a password.",
  "auth/account-exists-with-different-credential": "That Google account's email already has a Wizezz account. Log in with email first, then connect Google.",
  "auth/credential-already-in-use": "That Google account is already linked to another Wizezz account.",
  "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
  "auth/requires-recent-login": "For safety, log out and sign in again, then retry."
};

function friendly(e) {
  return MESSAGES[e.code] || "Something went wrong. Please try again.";
}

const account = {
  friendly,

  async signUp(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    emitState(cred.user);
  },

  async logIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    emitState(cred.user);
  },

  async googleSignIn() {
    const cred = await signInWithPopup(auth, googleProvider);
    emitState(cred.user);
  },

  async connectGoogle() {
    const cred = await linkWithPopup(auth.currentUser, googleProvider);
    emitState(cred.user);
  },

  async setPassword(password) {
    const user = auth.currentUser;
    const cred = await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
    emitState(cred.user);
  },

  async logOut() {
    await signOut(auth);
  }
};

window.account = account;

onAuthStateChanged(auth, async user => {
  emitState(user);
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    window.dispatchEvent(new CustomEvent("account-rating", {detail: snap.exists() ? snap.data() : {elo: null}}));
  } catch (e) {
    console.error("Could not load rating", e);
  }
});
