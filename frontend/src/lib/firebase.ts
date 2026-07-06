import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

// Fetch the config dynamically
async function fetchFirebaseConfig() {
  const response = await fetch('/firebase-applet-config.json');
  if (!response.ok) {
    throw new Error('Failed to fetch firebase config');
  }
  return await response.json();
}

let app: any;
let auth: any;
let db: any;
const googleProvider = new GoogleAuthProvider();

export async function initFirebase() {
  if (getApps().length === 0) {
    const config = await fetchFirebaseConfig();
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

export { googleProvider };

// Helper to get initialized instances safely
export async function getFirebaseInstances() {
  if (!auth || !db) {
    await initFirebase();
  }
  return { auth, db };
}
