// ============================================================
// Hệ thống real-time listeners — tự động cập nhật dữ liệu khi
// Firestore thay đổi (sản phẩm, thông báo, đơn hàng...)
// KHÔNG reload trang — chỉ cập nhật state, trang tự render lại
// nếu cần (xem main.js).
// ============================================================
import {
  collection, onSnapshot, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-init.js';
import { state } from './state.js';
import { toMillis } from './helpers.js';

// Sắp xếp giảm dần theo createdAt phía client (tránh cần composite index
// cho query where + orderBy — nếu thiếu index, Firestore từ chối query và
// listener im lặng khiến dữ liệu trống trơn).
function sortDescByCreatedAt(arr){
  return arr.slice().sort((a,b)=> toMillis(b.createdAt) - toMillis(a.createdAt));
}

// Lưu trữ các unsubscribe functions để dừng lắng nghe khi cần
const activeListeners = {};

// Hàm khởi tạo listener cho product updates
export function listenToProducts(callback) {
  if (activeListeners.products) activeListeners.products();
  
  // KHÔNG dùng orderBy ở đây (cần Firestore index). Sắp xếp phía client.
  const q = query(collection(db, 'products'));
  activeListeners.products = onSnapshot(q, (snapshot) => {
    const products = sortDescByCreatedAt(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    state.products = products;
    if (callback) callback(products);
  }, (error) => console.error('Products listener error:', error));
}

// Hàm khởi tạo listener cho notifications của user hiện tại
export function listenToUserNotifications(userId, callback) {
  if (!userId) {
    if (activeListeners.notifications) activeListeners.notifications();
    return;
  }
  
  if (activeListeners.notifications) activeListeners.notifications();
  
  // KHÔNG dùng orderBy ở đây (where + orderBy cần composite index).
  // Sắp xếp phía client bằng sortDescByCreatedAt.
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(50)
  );
  activeListeners.notifications = onSnapshot(q, (snapshot) => {
    const notifications = sortDescByCreatedAt(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    state.notifications = notifications;
    if (callback) callback(notifications);
  }, (error) => console.error('Notifications listener error:', error));
}

// Hàm khởi tạo listener cho orders của user — lắng nghe CẢ vai trò người mua
// (buyerId) LẪN người bán (sellerId), gộp lại vào state.userOrders.
export function listenToUserOrders(userId, callback) {
  if (!userId) {
    if (activeListeners.ordersBuyer) activeListeners.ordersBuyer();
    if (activeListeners.ordersSeller) activeListeners.ordersSeller();
    return;
  }
  
  if (activeListeners.ordersBuyer) activeListeners.ordersBuyer();
  if (activeListeners.ordersSeller) activeListeners.ordersSeller();
  
  // KHÔNG dùng orderBy ở đây (where + orderBy cần composite index).
  const qBuyer = query(collection(db, 'orders'), where('buyerId', '==', userId));
  const qSeller = query(collection(db, 'orders'), where('sellerId', '==', userId));
  
  let buyerOrders = [];
  let sellerOrders = [];
  
  const mergeAndEmit = () => {
    // Gộp 2 nguồn, loại trùng (trường hợp hi hữu user tự mua hàng của mình)
    const map = new Map();
    [...buyerOrders, ...sellerOrders].forEach(o => map.set(o.id, o));
    const orders = sortDescByCreatedAt(Array.from(map.values()));
    state.userOrders = orders;
    if (callback) callback(orders);
  };
  
  activeListeners.ordersBuyer = onSnapshot(qBuyer, (snapshot) => {
    buyerOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    mergeAndEmit();
  }, (error) => console.error('Orders (buyer) listener error:', error));
  
  activeListeners.ordersSeller = onSnapshot(qSeller, (snapshot) => {
    sellerOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    mergeAndEmit();
  }, (error) => console.error('Orders (seller) listener error:', error));
}

// Hàm khởi tạo listener cho product history (lịch sử gỡ bài, từ chối...)
export function listenToProductHistory(productId, callback) {
  if (!productId) {
    if (activeListeners.productHistory) activeListeners.productHistory();
    return;
  }
  
  if (activeListeners.productHistory) activeListeners.productHistory();
  
  const q = query(
    collection(db, 'productHistory'),
    where('productId', '==', productId),
    orderBy('timestamp', 'desc')
  );
  activeListeners.productHistory = onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (callback) callback(history);
  }, (error) => console.error('Product history listener error:', error));
}

// Dừng chỉ các listener phụ thuộc auth (thông báo, đơn hàng...).
// Listener sản phẩm phải luôn ở trên để guest users vẫn thấy danh sách hàng.
export function stopAllListeners() {
  Object.entries(activeListeners).forEach(([key, unsubscribe]) => {
    if (key === 'products' || key === 'productHistory') return;
    if (unsubscribe) unsubscribe();
    activeListeners[key] = null;
  });
  state.userOrders = [];
  state.notifications = [];
}
