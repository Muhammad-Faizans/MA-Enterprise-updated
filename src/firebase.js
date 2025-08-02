import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAntzJdhgRDpHl3kvYeCdUWuexOTJAmqhY",
  authDomain: "ma-interprise.firebaseapp.com",
  projectId: "ma-interprise",
  storageBucket: "ma-interprise.firebasestorage.app",
  messagingSenderId: "209730663761",
  appId: "1:209730663761:web:aefa85d6997ca3162a0f70",
  measurementId: "G-X6Y3T8JXDE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth }; 