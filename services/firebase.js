// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD1A0Qr7uVplY-QCWM_hnbtZsFT8m91LuA",
    authDomain: "smartcalendar-599cd.firebaseapp.com",
    projectId: "smartcalendar-599cd",
    storageBucket: "smartcalendar-599cd.firebasestorage.app",
    messagingSenderId: "22688391801",
    appId: "1:22688391801:web:0ccd626a0c8ab0c05daaa8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };