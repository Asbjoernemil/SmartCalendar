// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAK3IXWwb6746kCaD8It1K2ux2KLoQKWBo",
    authDomain: "smartcalendar2-bcf0c.firebaseapp.com",
    projectId: "smartcalendar2-bcf0c",
    storageBucket: "smartcalendar2-bcf0c.firebasestorage.app",
    messagingSenderId: "313425653241",
    appId: "1:313425653241:web:7532499556faa60ebae128"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };