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
  apiKey: "AIzaSyCBQ2Ojv7kyxW1WEsC4EjN2LMloW_3pMoM",
  authDomain: "cookieplus-6bbe3.firebaseapp.com",
  projectId: "cookieplus-6bbe3",
  storageBucket: "cookieplus-6bbe3.firebasestorage.app",
  messagingSenderId: "818909902958",
  appId: "1:818909902958:web:6109548349a77976bece7f"
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