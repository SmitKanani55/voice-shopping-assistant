import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  // ←←← REPLACE WITH YOUR OWN FROM FIREBASE CONSOLE
  apiKey: "AIzaSyB9j4wbuz6FowZ8Ks4ULcUsVVz6K1S2uxg",
  authDomain: "voice-command-e4b80.firebaseapp.com",
  projectId: "voice-command-e4b80",
  storageBucket: "voice-command-e4b80.firebasestorage.app",
  messagingSenderId: "186046674738",
  appId: "1:186046674738:web:14506172c4cb1b5b81092b",
  measurementId: "G-7TV1HVE246"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)