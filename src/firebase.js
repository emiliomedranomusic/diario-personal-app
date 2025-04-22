// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCfxTFUDHemrPTcpQ-Ux1XyTYYrZKkFVWU",
  authDomain: "diario-c018b.firebaseapp.com",
  projectId: "diario-c018b",
  storageBucket: "diario-c018b.firebasestorage.app",
  messagingSenderId: "949823515907",
  appId: "1:949823515907:web:262995728749f701328d36"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };