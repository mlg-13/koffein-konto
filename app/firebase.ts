// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDMFp-8R5wJDGvCFBrG-iUvkhPFaY6EWjw",
    authDomain: "koffein-konto.firebaseapp.com",
    projectId: "koffein-konto",
    storageBucket: "koffein-konto.firebasestorage.app",
    messagingSenderId: "23576461839",
    appId: "1:23576461839:web:3d2b575810b8d22152197a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);