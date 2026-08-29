// ============================================================
// Đăng ký / Đăng nhập (Email-Password + Google) / Đăng xuất.
// ============================================================
import { auth } from './firebase-init.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-init.js';
import { toast, mapAuthError } from './helpers.js';
import { closeModalsAndRefresh } from './modals.js';
import { nav } from './router.js';

async function submitRegister(e){
  e.preventDefault();
  const f = new FormData(e.target);
  const name=f.get('name').trim(), email=f.get('email').trim().toLowerCase(), phone=f.get('phone').trim(), password=f.get('password');
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName:name });
    await setDoc(doc(db,'users',cred.user.uid), { name, email, phone, role:'user', cart:[], dealsCompleted:0, ratingSum:0, ratingCount:0, createdAt: serverTimestamp() });
    toast('Đăng ký thành công, chào mừng '+name+'!','success');
    await closeModalsAndRefresh();
  }catch(err){ toast(mapAuthError(err),'error'); }
  return false;
}

async function submitLogin(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const email=f.get('email').trim().toLowerCase(), password=f.get('password');
  try{
    await signInWithEmailAndPassword(auth, email, password);
    toast('Đăng nhập thành công!','success');
    await closeModalsAndRefresh();
  }catch(err){ toast(mapAuthError(err),'error'); }
  return false;
}

async function signInGoogle(){
  try{
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    toast('Đăng nhập Google thành công!','success');
    await closeModalsAndRefresh();
  }catch(err){ toast(mapAuthError(err),'error'); }
}

async function logout(){
  await signOut(auth);
  toast('Đã đăng xuất.');
  await nav('home');
}

export { submitRegister, submitLogin, signInGoogle, logout };
