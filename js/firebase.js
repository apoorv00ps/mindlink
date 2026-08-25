import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, onValue, onDisconnect, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB2IHwaueY5OdS5WaaWiDMSs92DI5TE6os",
    authDomain: "mind-link-00.firebaseapp.com",
    databaseURL: "https://mind-link-00-default-rtdb.firebaseio.com",
    projectId: "mind-link-00",
    storageBucket: "mind-link-00.firebasestorage.app",
    messagingSenderId: "549950202165",
    appId: "1:549950202165:web:0935448a4f07f10eae6c7c",
    measurementId: "G-94BXRH8W01"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, signInWithPopup, onAuthStateChanged, signOut, ref, set, onValue, onDisconnect, remove, push, serverTimestamp };
