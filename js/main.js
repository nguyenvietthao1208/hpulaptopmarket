// ============================================================
// HPU LAPTOPMARKET (HPU_LM) — điểm khởi động của ứng dụng.
// File này chỉ làm 3 việc: (1) lắng nghe trạng thái đăng nhập Firebase,
// (2) đọc route ban đầu từ URL, (3) expose các hàm cần thiết ra window để
// các thuộc tính onclick/onchange/oninput trong HTML gọi được.
// Toàn bộ logic thật nằm trong các file module riêng — xem cấu trúc thư mục
// trong README.md.
// ============================================================
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { state } from './state.js';
import { toast, scrollToTop, copyText, esc } from './helpers.js';
import { render, renderHeader, renderPage, renderPageSmooth, nav, goSell, goMyListings, goOrders, toggleNotif, notifClick, parseRouteFromLocation, toggleDarkMode, initDarkMode } from './router.js';
import { listenToProducts, listenToUserNotifications, listenToUserOrders, stopAllListeners } from './realtime.js';
import {
  openAuth, closeAuth, openCheckout, closeCheckout,
  rejectProductPrompt, closeRejectModal, openRating, closeRatingModal, setRatingStars,
  cancelOrderPrompt, closeCancelModal, openDeleteProductModal, closeDeleteProductModal,
  openDeleteAccountModal, closeDeleteAccountModal, showNotification, closeNotification,
  renderModals, closeModalsAndRefresh
} from './modals.js';

import { submitRegister, submitLogin, submitForgotPassword, submitForgotPasswordVerify, forgotCurrentPassword, signInGoogle, logout, submitDeleteAccountStep1, submitDeleteAccountStep2 } from './actions-auth.js';
import { setFilter, resetFilters } from './pages/home.js';
import { submitComment } from './pages/product.js';
import { submitListing, onImagesSelected, removeImage } from './pages/sell.js';
import { deleteListing } from './pages/mylistings.js';
import { addToCart, removeFromCart } from './pages/cart.js';
import { submitOrder, sellerConfirm, sellerShip, buyerConfirmReceived, submitCancel, submitRating } from './pages/orders.js';
import { approveProduct, submitReject, adminDeleteProduct, submitDeleteProduct } from './pages/admin.js';
import { onAvatarSelected, submitProfile, submitChangePassword } from './pages/profile.js';
import { onLeaderboardSearchInput } from './pages/leaderboard.js';
import { toggleFaq } from './pages/faq.js';

/* ============ Đọc route ban đầu từ URL (để reload trang không bị mất) ============ */
try { if (location.hash) state.route = parseRouteFromLocation(); } catch (e) {}

// Theo dõi thông báo đã thấy bằng ID — chính xác hơn so sánh số lượng.
// Snapshot đầu tiên: chỉ ghi nhận ID (không popup — đó là thông báo cũ).
// Các snapshot sau: ID chưa thấy + chưa đọc → hiện popup.
let notifListenerReady = false;
const seenNotifIds = new Set();

/* ============ Khởi tạo Dark Mode ============ */
initDarkMode();

/* ============ Lắng nghe trạng thái đăng nhập Firebase ============ */
onAuthStateChanged(auth, async (fbUser) => {
  try {
    if (fbUser) {
      const uref = doc(db, 'users', fbUser.uid);
      let usnap = await getDoc(uref);
      if (!usnap.exists()) {
        const newUser = {
          name: fbUser.displayName || (fbUser.email || 'Người dùng').split('@')[0],
          email: fbUser.email || '', phone: '', role: 'user', cart: [],
          dealsCompleted: 0, ratingSum: 0, ratingCount: 0, createdAt: serverTimestamp()
        };
        await setDoc(uref, newUser);
        usnap = await getDoc(uref);
      }
      state.currentUser = { uid: fbUser.uid, ...usnap.data() };
      notifListenerReady = false; // reset cờ cho phiên đăng nhập mới
      seenNotifIds.clear(); // reset danh sách ID đã thấy
      
      // Listeners chỉ cho user đã đăng nhập (thông báo, đơn hàng)
      listenToUserNotifications(fbUser.uid, (notifications) => {
        const isFirstSnapshot = !notifListenerReady;
        const freshNotifs = notifications.filter(n => !seenNotifIds.has(n.id));
        if(!isFirstSnapshot){
          freshNotifs.filter(n => !n.read).forEach(n => showNotifPopup(n));
        }
        notifications.forEach(n => seenNotifIds.add(n.id));
        notifListenerReady = true;
        state.notifications = notifications;
        renderHeader();
        refreshCurrentPage();
      });
      listenToUserOrders(fbUser.uid, (orders) => {
        state.userOrders = orders;
        refreshCurrentPage();
      });
    } else {
      state.currentUser = null;
      state.notifications = [];
      state.userOrders = [];
      stopAllListeners();
      listenToProducts(() => {
        refreshCurrentPage();
      });
    }
  } catch (err) {
    console.error('Lỗi tải hồ sơ người dùng:', err);
    toast('Không tải được hồ sơ người dùng: ' + err.message, 'error');
  }
  await render();
});

// Listener sản phẩm LUÔN chạy (không phụ thuộc đăng nhập) — cả khách và user
// đã đăng nhập đều thấy sản phẩm. Khi có tin mới/được duyệt/gỡ → trang chủ
// tự cập nhật realtime.
listenToProducts(() => {
  refreshCurrentPage();
});

/* ============ Kiểm tra người dùng có đang gõ/chọn trong form không ============ */
// Tránh render lại trang khi người dùng đang tương tác với input/select/textarea
// (nếu render lại, con trỏ gõ sẽ bị mất — rất khó chịu).
function isUserTyping(){
  const el = document.activeElement;
  if(!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/* ============ Làm mới trang hiện tại một cách mượt mà ============ */
// Cập nhật realtime kiểu "tự nhiên, nhẹ nhàng": so sánh HTML mới với DOM cũ,
// CHỈ thay section thực sự thay đổi (kèm fade nhẹ), phần không đổi giữ nguyên
// tuyệt đối — ảnh không tải lại, cuộn không nhảy, input không mất trạng thái.
// Bỏ qua nếu người dùng đang gõ trong form hoặc đang mở modal.
function refreshCurrentPage(){
  if(isUserTyping()) return;
  if(document.querySelector('.modal-overlay')) return; // đang mở modal
  renderPageSmooth();
}

/* ============ Popup thông báo mới (góc dưới bên trái, xếp chồng) ============ */
// Hỗ trợ NHIỀU popup cùng lúc — mỗi thông báo mới 1 popup, xếp chồng lên nhau.
// Tối đa 4 popup hiển thị cùng lúc; các popup cũ tự ẩn sau 8 giây.
const POPUP_MAX = 4;
const POPUP_GAP = 10;

// Sắp xếp lại vị trí (bottom) của tất cả popup đang hiển thị — popup mới nhất
// ở dưới cùng, popup cũ hơn đẩy dần lên trên.
function relayoutNotifPopups(){
  const popups = Array.from(document.querySelectorAll('.notif-popup'));
  const isMobile = window.innerWidth <= 640;
  let bottom = isMobile ? 76 : 20; // mobile: trên thanh CTA dính đáy
  // Duyệt từ popup MỚI NHẤT (cuối danh sách) lên trên
  for(let i = popups.length - 1; i >= 0; i--){
    const p = popups[i];
    p.style.bottom = bottom + 'px';
    bottom += p.offsetHeight + POPUP_GAP;
  }
}

function showNotifPopup(notif){
  if(!notif) return;
  
  const popup = document.createElement('div');
  popup.className = 'notif-popup';
  popup.innerHTML = `
    <div class="notif-popup-head">
      <span class="notif-popup-badge">🔔</span>
      <strong>Thông báo mới</strong>
      <button class="notif-popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="notif-popup-title">${esc(notif.title || '')}</div>
    <div class="notif-popup-msg">${esc(notif.message || '')}</div>
    <button class="btn btn-primary btn-sm btn-block" onclick="notifClickFromPopup('${notif.id}')">Xem chi tiết</button>
  `;
  document.body.appendChild(popup);
  
  // Giới hạn số popup hiển thị cùng lúc — xóa popup cũ nhất nếu vượt quá
  const all = document.querySelectorAll('.notif-popup');
  if(all.length > POPUP_MAX){
    all[0].remove();
  }
  
  // Xếp chồng: đợi 1 frame để popup có kích thước rồi tính vị trí
  requestAnimationFrame(relayoutNotifPopups);
  
  // Tự ẩn sau 8 giây + xếp lại vị trí các popup còn lại
  setTimeout(() => {
    if(popup.parentNode) popup.remove();
    relayoutNotifPopups();
  }, 8000);
}

// Xử lý click từ popup — đánh dấu đã đọc + điều hướng
async function notifClickFromPopup(notifId){
  const n = (state.notifications || []).find(x => x.id === notifId);
  try{
    const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  }catch(err){}
  document.querySelectorAll('.notif-popup').forEach(el => el.remove());
  if(n && n.link && n.link.page){
    await nav(n.link.page, n.link.params || {});
  } else {
    await render();
  }
}

/* ============ Nút liên hệ Admin nổi (góc dưới bên phải) ============ */
function toggleContactPanel(){
  const fab = document.getElementById('contact-fab');
  if(!fab) return;
  fab.classList.toggle('open');
}

// Đóng panel khi bấm ra ngoài
document.addEventListener('click', (e) => {
  const fab = document.getElementById('contact-fab');
  if(!fab || !fab.classList.contains('open')) return;
  if(!fab.contains(e.target)) fab.classList.remove('open');
});

/* ============ Expose ra window để các onclick/onchange/oninput trong HTML gọi được ============ */
Object.assign(window, {
  nav, goSell, goMyListings, goOrders, toggleNotif,
  openAuth, closeAuth, openCheckout, closeCheckout,
  rejectProductPrompt, closeRejectModal, openRating, closeRatingModal, setRatingStars,
  cancelOrderPrompt, closeCancelModal, openDeleteProductModal, closeDeleteProductModal,
  openDeleteAccountModal, closeDeleteAccountModal, showNotification, closeNotification,
  renderModals, closeModalsAndRefresh,
  submitRegister, submitLogin, submitForgotPassword, submitForgotPasswordVerify, forgotCurrentPassword, signInGoogle, logout,
  submitListing, deleteListing, approveProduct, submitReject, submitDeleteProduct,
  onImagesSelected, removeImage,
  addToCart, removeFromCart, submitOrder,
  sellerConfirm, sellerShip, buyerConfirmReceived, submitCancel, submitRating, submitComment,
  render, renderPageSmooth, setFilter, resetFilters,
  scrollToTop, copyText,
  adminDeleteProduct, notifClick, onAvatarSelected, onLeaderboardSearchInput, submitProfile, submitChangePassword,
  toggleFaq, toggleDarkMode, toggleContactPanel, notifClickFromPopup,
  submitDeleteAccountStep1, submitDeleteAccountStep2
});
