// src/firebase/index.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA_XvAPygXMMMddn7NsqsogzDpM-FXDgeI",
  authDomain: "cert-final-c1409.firebaseapp.com",
  projectId: "cert-final-c1409",
  storageBucket: "cert-final-c1409.appspot.com", 
  messagingSenderId: "948127703754",
  appId: "1:948127703754:web:03289910ff99fb33ee4a33",
  measurementId: "G-PBNBSHK135"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export Firestore and Storage for use in the app
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
