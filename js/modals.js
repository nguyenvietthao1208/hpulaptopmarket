// ============================================================
// Tất cả modal (đăng nhập/đăng ký, xác nhận đặt mua, từ chối tin, đánh giá,
// hủy đơn) — state riêng của từng modal nằm ngay trong file này.
// ============================================================
import { state } from './state.js';
import { esc, fmtVND, toast } from './helpers.js';
import { fetchDoc } from './firestore-helpers.js';
import { render, requireLogin } from './router.js';

let authModal = null;
let checkoutModal = null;
let rejectModalId = null;
let ratingModalId = null;
let ratingStars = 5;
let cancelModalId = null;

function openAuth(mode){ authModal=mode; renderModals(); }

function closeAuth(){ authModal=null; renderModals(); }

async function openCheckout(productId){
  if(!requireLogin()) return;
  const p = await fetchDoc('products', productId);
  if(!p || p.status!=='approved'){ toast('Sản phẩm này hiện không thể đặt mua.','error'); return; }
  checkoutModal = { product:p };
  renderModals();
}

function closeCheckout(){ checkoutModal=null; renderModals(); }

function rejectProductPrompt(id){ rejectModalId=id; renderModals(); }

function closeRejectModal(){ rejectModalId=null; renderModals(); }

function openRating(orderId){ ratingModalId=orderId; ratingStars=5; renderModals(); }

function closeRatingModal(){ ratingModalId=null; renderModals(); }

function setRatingStars(n){ ratingStars=n; renderModals(); }

function cancelOrderPrompt(orderId){ cancelModalId=orderId; renderModals(); }

function closeCancelModal(){ cancelModalId=null; renderModals(); }

function renderAuthModalIfNeeded(){
  if(!authModal) return '';
  const isLogin = authModal==='login';
  return `<div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
    <div class="modal">
      <div class="modal-head"><h3>${isLogin?'Đăng nhập':'Đăng ký tài khoản'}</h3><button class="modal-close" onclick="closeAuth()">×</button></div>
      <button class="btn btn-ghost btn-block" type="button" onclick="signInGoogle()">Đăng nhập bằng Google</button>
      <div class="divider"></div>
      <form onsubmit="return ${isLogin?'submitLogin(event)':'submitRegister(event)'}">
        ${!isLogin? `<div class="field"><label>Họ và tên *</label><input class="input" name="name" required></div>`:''}
        <div class="field"><label>Email *</label><input class="input" type="email" name="email" required></div>
        ${!isLogin? `<div class="field"><label>Số điện thoại *</label><input class="input" name="phone" required pattern="[0-9]{9,11}"></div>`:''}
        <div class="field"><label>Mật khẩu *</label><input class="input" type="password" name="password" required minlength="6"></div>
        <button class="btn btn-primary btn-block" type="submit">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
      </form>
      <p class="field hint" style="margin-top:14px;text-align:center;">${isLogin? `Chưa có tài khoản? <a href="#" class="linklike" onclick="openAuth('register');return false;">Đăng ký</a>`:`Đã có tài khoản? <a href="#" class="linklike" onclick="openAuth('login');return false;">Đăng nhập</a>`}</p>
    </div>
  </div>`;
}

function renderCheckoutModalIfNeeded(){
  if(!checkoutModal) return '';
  const p = checkoutModal.product;
  return `<div class="modal-overlay" onclick="if(event.target===this)closeCheckout()">
    <div class="modal">
      <div class="modal-head"><h3>Xác nhận đặt mua</h3><button class="modal-close" onclick="closeCheckout()">×</button></div>
      <p class="field hint" style="text-transform:none;margin-bottom:14px;">${esc(p.title)} — <b class="mono">${fmtVND(p.price)}</b><br>Vui lòng để lại thông tin nhận hàng để người bán liên hệ giao dịch.</p>
      <form onsubmit="return submitOrder(event,'${p.id}')">
        <div class="field"><label>Họ tên người nhận *</label><input class="input" name="name" required value="${esc(state.currentUser?state.currentUser.name:'')}"></div>
        <div class="field"><label>Số điện thoại *</label><input class="input" name="phone" required pattern="[0-9]{9,11}" value="${esc(state.currentUser?state.currentUser.phone:'')}"></div>
        <div class="field"><label>Địa chỉ nhận hàng *</label><textarea class="textarea" name="address" required></textarea></div>
        <div class="field"><label>Ghi chú (tùy chọn)</label><textarea class="textarea" name="note"></textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Xác nhận đặt mua</button>
      </form>
    </div>
  </div>`;
}

function renderRejectModalIfNeeded(){
  if(!rejectModalId) return '';
  return `<div class="modal-overlay" onclick="if(event.target===this)closeRejectModal()">
    <div class="modal">
      <div class="modal-head"><h3>Từ chối tin đăng</h3><button class="modal-close" onclick="closeRejectModal()">×</button></div>
      <form onsubmit="return submitReject(event,'${rejectModalId}')">
        <div class="field"><label>Lý do từ chối *</label><textarea class="textarea" name="reason" required placeholder="vd: thiếu thông tin cấu hình, giá không hợp lý..."></textarea></div>
        <button class="btn btn-danger btn-block" type="submit">Từ chối tin</button>
      </form>
    </div>
  </div>`;
}

function renderRatingModalIfNeeded(){
  if(!ratingModalId) return '';
  return `<div class="modal-overlay" onclick="if(event.target===this)closeRatingModal()">
    <div class="modal">
      <div class="modal-head"><h3>Đánh giá người bán</h3><button class="modal-close" onclick="closeRatingModal()">×</button></div>
      <div class="field"><label>Số sao</label><div>${[1,2,3,4,5].map(n=>`<button type="button" class="rating-star-btn ${n<=ratingStars?'on':''}" onclick="setRatingStars(${n})">★</button>`).join('')}</div></div>
      <form onsubmit="return submitRating(event,'${ratingModalId}')">
        <div class="field"><label>Nhận xét</label><textarea class="textarea" name="comment" placeholder="Cảm nhận của bạn về người bán và sản phẩm..."></textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Gửi đánh giá</button>
      </form>
    </div>
  </div>`;
}

function renderCancelModalIfNeeded(){
  if(!cancelModalId) return '';
  return `<div class="modal-overlay" onclick="if(event.target===this)closeCancelModal()">
    <div class="modal">
      <div class="modal-head"><h3>Hủy đơn hàng</h3><button class="modal-close" onclick="closeCancelModal()">×</button></div>
      <form onsubmit="return submitCancel(event,'${cancelModalId}')">
        <div class="field"><label>Lý do hủy *</label><textarea class="textarea" name="reason" required></textarea></div>
        <button class="btn btn-danger btn-block" type="submit">Xác nhận hủy đơn</button>
      </form>
    </div>
  </div>`;
}

function renderModals(){
  document.getElementById('modal-root').innerHTML =
    renderAuthModalIfNeeded() + renderCheckoutModalIfNeeded() + renderRejectModalIfNeeded() +
    renderRatingModalIfNeeded() + renderCancelModalIfNeeded();
}

async function closeModalsAndRefresh(){
  authModal=null; checkoutModal=null; rejectModalId=null; ratingModalId=null; cancelModalId=null;
  renderModals();
  await render();
}
function getRatingStars(){ return ratingStars; }

export {
  openAuth, closeAuth, openCheckout, closeCheckout,
  rejectProductPrompt, closeRejectModal, openRating, closeRatingModal, setRatingStars, getRatingStars,
  cancelOrderPrompt, closeCancelModal, renderModals, closeModalsAndRefresh
};
