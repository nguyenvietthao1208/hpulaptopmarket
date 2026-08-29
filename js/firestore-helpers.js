// ============================================================
// Hàm dùng chung để đọc/ghi Firestore (get toàn bộ collection, theo điều kiện,
// theo id, và tạo thông báo trong app).
// ============================================================
import {
  getDocs, getDoc, doc, collection, query, where, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-init.js';

async function fetchAll(colName){
  const snap = await getDocs(collection(db,colName));
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

async function fetchWhere(colName, field, op, value){
  const q = query(collection(db,colName), where(field,op,value));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

async function fetchDoc(colName, id){
  const snap = await getDoc(doc(db,colName,id));
  return snap.exists() ? { id:snap.id, ...snap.data() } : null;
}

async function notifyUser(userId, title, message, link){
  await addDoc(collection(db,'notifications'), { userId, title, message, link: link||null, read:false, createdAt: serverTimestamp() });
}

export { fetchAll, fetchWhere, fetchDoc, notifyUser };
