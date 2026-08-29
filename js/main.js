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
import { toast, scrollToTop, copyText } from './helpers.js';
import { render, nav, goSell, goMyListings, goOrders, toggleNotif, notifClick, parseRouteFromLocation } from './router.js';
import {
  openAuth, closeAuth, openCheckout, closeCheckout,
  rejectProductPrompt, closeRejectModal, openRating, closeRatingModal, setRatingStars,
  cancelOrderPrompt, closeCancelModal
} from './modals.js';

import { submitRegister, submitLogin, signInGoogle, logout } from './actions-auth.js';
import { setFilter, resetFilters } from './pages/home.js';
import { submitComment } from './pages/product.js';
import { submitListing, onImagesSelected, removeImage } from './pages/sell.js';
import { deleteListing } from './pages/mylistings.js';
import { addToCart, removeFromCart } from './pages/cart.js';
import { submitOrder, sellerConfirm, sellerShip, buyerConfirmReceived, submitCancel, submitRating } from './pages/orders.js';
import { approveProduct, submitReject, adminDeleteProduct } from './pages/admin.js';
import { onAvatarSelected, submitProfile } from './pages/profile.js';
import { onLeaderboardSearchInput } from './pages/leaderboard.js';
import { toggleFaq } from './pages/faq.js';

/* ============ Đọc route ban đầu từ URL (để reload trang không bị mất) ============ */
try { if (location.hash) state.route = parseRouteFromLocation(); } catch (e) {}

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
    } else {
      state.currentUser = null;
    }
  } catch (err) {
    console.error('Lỗi tải hồ sơ người dùng:', err);
    toast('Không tải được hồ sơ người dùng: ' + err.message, 'error');
  }
  await render();
});

/* ============ Expose ra window để các onclick/onchange/oninput trong HTML gọi được ============ */
Object.assign(window, {
  nav, goSell, goMyListings, goOrders, toggleNotif,
  openAuth, closeAuth, openCheckout, closeCheckout,
  rejectProductPrompt, closeRejectModal, openRating, closeRatingModal, setRatingStars,
  cancelOrderPrompt, closeCancelModal,
  submitRegister, submitLogin, signInGoogle, logout,
  submitListing, deleteListing, approveProduct, submitReject,
  onImagesSelected, removeImage,
  addToCart, removeFromCart, submitOrder,
  sellerConfirm, sellerShip, buyerConfirmReceived, submitCancel, submitRating, submitComment,
  render, setFilter, resetFilters,
  scrollToTop, copyText,
  adminDeleteProduct, notifClick, onAvatarSelected, onLeaderboardSearchInput, submitProfile,
  toggleFaq
});
