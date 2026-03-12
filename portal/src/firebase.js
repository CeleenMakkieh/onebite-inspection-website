import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCu_RkLhERtVh98WELxe_X4jpwh-wcQCSw",
  authDomain: "one-bite-inspectionss.firebaseapp.com",
  projectId: "one-bite-inspectionss",
  storageBucket: "one-bite-inspectionss.firebasestorage.app",
  messagingSenderId: "672672795070",
  appId: "1:672672795070:web:2e1d1106d045e2997211ef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
