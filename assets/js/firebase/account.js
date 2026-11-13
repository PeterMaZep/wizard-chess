import {initializeApp} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
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
const provider = new GoogleAuthProvider();
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

window.accountToggle = async () => {
  try {
    if (auth.currentUser) await signOut(auth);
    else await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Sign-in failed", e);
  }
};

onAuthStateChanged(auth, async user => {
  uid = user ? user.uid : null;
  window.dispatchEvent(new CustomEvent("account-state", {detail: user ? {name: user.displayName || user.email || "Signed in"} : null}));
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    window.dispatchEvent(new CustomEvent("account-rating", {detail: snap.exists() ? snap.data() : {elo: null}}));
  } catch (e) {
    console.error("Could not load rating", e);
  }
});
