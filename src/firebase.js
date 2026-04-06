import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// นำข้อมูลจากข้อ 1 มาวางตรงนี้
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // ถ้าใช้ฐานข้อมูลหลัก ไม่ต้องใส่ ID เพิ่มเติม
export const googleProvider = new GoogleAuthProvider();

// Functions สำหรับเรียกใช้ใน App.jsx
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const registerWithEmail = async (email, password, displayName) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(res.user, { displayName });
  return res;
};
export const logout = () => signOut(auth);

export const updateUserProfile = (profile) => {
  return new Promise((resolve, reject) => {
    if (!auth.currentUser) {
      return reject(new Error("No user is currently signed in."));
    }
    updateProfile(auth.currentUser, profile)
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
};