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
let notificationMessage = null;
let deleteProductModalId = null;
let deleteAccountModalOpen = false; // chỉ render modal khi = true
let deleteAccountStep = 0; // 0: nhập mật khẩu, 1: nhập mã xác nhận
let deleteAccountCode = '';

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

function openDeleteProductModal(id){ deleteProductModalId=id; renderModals(); }

function closeDeleteProductModal(){ deleteProductModalId=null; renderModals(); }

function openDeleteAccountModal(){ deleteAccountModalOpen=true; deleteAccountStep=0; deleteAccountCode=''; renderModals(); }

function closeDeleteAccountModal(){ deleteAccountModalOpen=false; deleteAccountStep=0; deleteAccountCode=''; renderModals(); }

function renderAuthModalIfNeeded(){
  if(!authModal) return '';
  const isLogin = authModal==='login';
  const isRegister = authModal==='register';
  const isForgot = authModal==='forgot';
  const isForgotVerify = authModal==='forgot-verify';
  const isForgotPassword = authModal==='forgot-password';

  if(isForgot){
    return `<div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
      <div class="modal">
        <div class="modal-head"><h3>Quên mật khẩu</h3><button class="modal-close" onclick="closeAuth()">×</button></div>
        <form onsubmit="return submitForgotPassword(event)">
          <div class="field"><label>Email muốn đặt lại mật khẩu *</label><input class="input" type="email" name="email" required placeholder="vd: email@example.com"></div>
          <button class="btn btn-primary btn-block" type="submit">Gửi mã xác thực</button>
        </form>
        <p class="field hint" style="margin-top:14px;text-align:center;">Đã nhớ mật khẩu? <a href="#" class="linklike" onclick="openAuth('login');return false;">Đăng nhập</a></p>
      </div>
    </div>`;
  }

  if(isForgotVerify){
    return `<div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
      <div class="modal">
        <div class="modal-head"><h3>Xác thực mã</h3><button class="modal-close" onclick="closeAuth()">×</button></div>
        <form onsubmit="return submitForgotPasswordVerify(event)">
          <p class="field hint" style="text-align:center;margin-bottom:16px;color:#666;">Nhập mã xác thực 4 chữ số đã được gửi tới email của bạn</p>
          <div class="field">
            <label>Mã xác thực 4 chữ số *</label>
            <div style="display:grid;grid-template-columns:repeat(4,minmax(48px,1fr));gap:10px;">
              ${[0,1,2,3].map(i => `<input class="input" data-otp-index="${i}" type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code" style="text-align:center;font-size:22px;padding:10px 0;" oninput="handleOtpInput(this)" onkeydown="handleOtpKeydown(this, event)" onpaste="handleOtpPaste(event)" />`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Xác thực</button>
        </form>
      </div>
    </div>`;
  }

  if(isForgotPassword){
    return `<div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
      <div class="modal">
        <div class="modal-head"><h3>Đặt mật khẩu mới</h3><button class="modal-close" onclick="closeAuth()">×</button></div>
        <p class="field hint" style="text-transform:none;margin-bottom:14px;">Mã xác thực đúng. Hãy nhập mật khẩu mới cho tài khoản của bạn.</p>
        <form onsubmit="return submitForgotPasswordChange(event)">
          <div class="field"><label>Mật khẩu mới *</label><input class="input" type="password" name="newPassword" required minlength="6" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự"></div>
          <div class="field"><label>Nhập lại mật khẩu mới *</label><input class="input" type="password" name="confirmPassword" required minlength="6" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới"></div>
          <button class="btn btn-primary btn-block" type="submit">Cập nhật mật khẩu</button>
        </form>
      </div>
    </div>`;
  }

  return `<div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
    <div class="modal">
      <div class="modal-head"><h3>${isLogin?'Đăng nhập':'Đăng ký tài khoản'}</h3><button class="modal-close" onclick="closeAuth()">×</button></div>
      <button class="btn btn-primary btn-block" type="button" onclick="signInGoogle()" style="background:linear-gradient(135deg, #4285f4 0%, #2d5bde 100%);font-weight:700;font-size:15px;">Đăng nhập bằng Google</button>
      <div class="divider"></div>
      <form onsubmit="return ${isLogin?'submitLogin(event)':'submitRegister(event)'}">
        ${!isLogin? `<div class="field"><label>Họ và tên *</label><input class="input" name="name" required placeholder="vd: Nguyễn Văn A"></div>`:''}
        <div class="field"><label>Email *</label><input class="input" type="email" name="email" required placeholder="vd: email@example.com"></div>
        ${!isLogin? `<div class="field"><label>Số điện thoại *</label><input class="input" name="phone" required pattern="[0-9]{9,11}" placeholder="(+84) 9xx xxx xxx"></div>`:''}
        <div class="field"><label>Mật khẩu *</label><input class="input" type="password" name="password" required minlength="6" placeholder="Tối thiểu 6 ký tự"></div>
        <button class="btn btn-primary btn-block" type="submit">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
      </form>
      <p class="field hint" style="margin-top:14px;text-align:center;">${isLogin ? `Chưa có tài khoản? <a href="#" class="linklike" onclick="openAuth('register');return false;">Đăng ký</a> · <a href="#" class="linklike" onclick="openAuth('forgot');return false;">Quên mật khẩu?</a>` : `Đã có tài khoản? <a href="#" class="linklike" onclick="openAuth('login');return false;">Đăng nhập</a>`}</p>
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
        <div class="field"><label>Họ tên người nhận *</label><input class="input" name="name" required value="${esc(state.currentUser?state.currentUser.name:'')}" placeholder="Họ tên người nhận"></div>
        <div class="field"><label>Số điện thoại *</label><input class="input" name="phone" required pattern="[0-9]{9,11}" value="${esc(state.currentUser?state.currentUser.phone:'')}" placeholder="(+84) 9xx xxx xxx"></div>
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

function renderDeleteProductModalIfNeeded(){
  if(!deleteProductModalId) return '';
  return `<div class="modal-overlay" onclick="if(event.target===this)closeDeleteProductModal()">
    <div class="modal">
      <div class="modal-head"><h3>Gỡ tin đăng</h3><button class="modal-close" onclick="closeDeleteProductModal()">×</button></div>
      <form onsubmit="return submitDeleteProduct(event,'${deleteProductModalId}')">
        <div class="field"><label>Lý do gỡ tin *</label><textarea class="textarea" name="reason" required placeholder="Vd: Vi phạm chính sách, nội dung không phù hợp, sản phẩm không tồn tại..."></textarea></div>
        <button class="btn btn-danger btn-block" type="submit">Xác nhận gỡ tin</button>
      </form>
    </div>
  </div>`;
}

function renderDeleteAccountModalIfNeeded(){
  if(!deleteAccountModalOpen) return ''; // chỉ render khi modal đang mở
  if(deleteAccountStep === 0){
    return `<div class="modal-overlay" onclick="if(event.target===this)closeDeleteAccountModal()">
      <div class="modal">
        <div class="modal-head"><h3>Xóa tài khoản</h3><button class="modal-close" onclick="closeDeleteAccountModal()">×</button></div>
        <div style="background:var(--danger-bg);padding:14px;border-radius:var(--radius);margin-bottom:16px;font-size:13px;color:var(--danger);line-height:1.5;">
          <strong>⚠️ Cảnh báo:</strong> Bạn sắp xóa vĩnh viễn tài khoản và toàn bộ dữ liệu. Thao tác này <strong>không thể hoàn tác</strong>. (Nếu bạn chưa có mật khẩu, hãy đăng xuất và thực hiện việc quên mật khẩu)
        </div>
        <form onsubmit="return submitDeleteAccountStep1(event)">
          <div class="field"><label>Nhập mật khẩu để xác nhận *</label><input class="input" type="password" name="password" required placeholder="Nhập mật khẩu hiện tại"></div>
          <button class="btn btn-danger btn-block" type="submit">Tiếp tục</button>
          <button class="btn btn-ghost btn-block" type="button" onclick="closeDeleteAccountModal()" style="margin-top:8px;">Hủy</button>
        </form>
      </div>
    </div>`;
  }
  return `<div class="modal-overlay" onclick="if(event.target===this)closeDeleteAccountModal()">
    <div class="modal">
      <div class="modal-head"><h3>Xác nhận xóa tài khoản</h3><button class="modal-close" onclick="closeDeleteAccountModal()">×</button></div>
      <p class="field hint" style="text-transform:none;margin-bottom:14px;">Chúng tôi đã gửi mã xác nhận 4 chữ số đến email của bạn. Nhập mã để tiếp tục xóa tài khoản.</p>
      <form onsubmit="return submitDeleteAccountStep2(event)">
        <div class="field">
          <label>Mã xác nhận 4 chữ số *</label>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(48px,1fr));gap:10px;">
            ${[0,1,2,3].map(i => `<input class="input" data-delete-otp-index="${i}" type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code" style="text-align:center;font-size:22px;padding:10px 0;" oninput="handleDeleteOtpInput(this)" onkeydown="handleDeleteOtpKeydown(this, event)" onpaste="handleDeleteOtpPaste(event)" />`).join('')}
          </div>
        </div>
        <button class="btn btn-danger btn-block" type="submit">Xác nhận xóa vĩnh viễn</button>
        <button class="btn btn-ghost btn-block" type="button" onclick="closeDeleteAccountModal()" style="margin-top:8px;">Hủy</button>
      </form>
    </div>
  </div>`;
}

function renderNotificationIfNeeded(){
  if(!notificationMessage) return '';
  return `<div class="modal-overlay" onclick="closeNotification()" style="background:rgba(0,0,0,0.5);">
    <div class="modal" style="text-align:center;max-width:360px;">
      <div style="padding:24px;">
        <h3 style="margin:0 0 14px 0;color:#333;font-size:18px;">✅ Thành công</h3>
        <p style="margin:0 0 20px 0;color:#666;font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(notificationMessage)}</p>
        <button class="btn btn-primary btn-block" type="button" onclick="closeNotification()">Đóng</button>
      </div>
    </div>
  </div>`;
}

function showNotification(msg){
  notificationMessage = msg;
  renderModals();
}

function closeNotification(){
  notificationMessage = null;
  renderModals();
}

function renderModals(){
  document.getElementById('modal-root').innerHTML =
    renderAuthModalIfNeeded() + renderCheckoutModalIfNeeded() + renderRejectModalIfNeeded() +
    renderRatingModalIfNeeded() + renderCancelModalIfNeeded() + renderDeleteProductModalIfNeeded() + renderDeleteAccountModalIfNeeded() + renderNotificationIfNeeded();
}

function handleOtpInput(el){
  const value = (el.value || '').replace(/\D/g,'').slice(-1);
  el.value = value;
  const idx = Number(el.dataset.otpIndex || 0);
  const form = el.closest('form');
  if(!form) return;
  const next = form.querySelector(`input[data-otp-index="${idx + 1}"]`);
  if(value && next){ next.focus(); }
}

function handleOtpKeydown(el, event){
  const idx = Number(el.dataset.otpIndex || 0);
  const form = el.closest('form');
  if(!form) return;

  if(event.key === 'Backspace' && !el.value && idx > 0){
    const prev = form.querySelector(`input[data-otp-index="${idx - 1}"]`);
    if(prev){ prev.focus(); prev.value=''; }
  }

  if(event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
    const delta = event.key === 'ArrowLeft' ? -1 : 1;
    const target = form.querySelector(`input[data-otp-index="${idx + delta}"]`);
    if(target){ event.preventDefault(); target.focus(); }
  }
}

function handleOtpPaste(event){
  const pasted = (event.clipboardData || window.clipboardData || {}).getData?.('text') || '';
  const digits = pasted.replace(/\D/g,'').slice(0,4);
  if(!digits) return;
  event.preventDefault();
  const form = event.target.closest('form');
  if(!form) return;
  const fields = Array.from(form.querySelectorAll('input[data-otp-index]'));
  digits.split('').forEach((digit, index) => {
    if(fields[index]) fields[index].value = digit;
  });
  const target = fields[Math.min(digits.length, fields.length - 1)];
  if(target) target.focus();
}

async function closeModalsAndRefresh(){
  authModal=null; checkoutModal=null; rejectModalId=null; ratingModalId=null; cancelModalId=null;
  deleteProductModalId=null; deleteAccountModalOpen=false; deleteAccountStep=0; deleteAccountCode='';
  notificationMessage=null;
  renderModals();
  await render();
}
function getRatingStars(){ return ratingStars; }

if (typeof window !== 'undefined') {
  window.handleOtpInput = handleOtpInput;
  window.handleOtpKeydown = handleOtpKeydown;
  window.handleOtpPaste = handleOtpPaste;
  window.setDeleteAccountStep = (step) => { deleteAccountStep = step; renderModals(); };
  window.handleDeleteOtpInput = handleDeleteOtpInput;
  window.handleDeleteOtpKeydown = handleDeleteOtpKeydown;
  window.handleDeleteOtpPaste = handleDeleteOtpPaste;
}

// OTP handlers cho modal xóa tài khoản (tương tự handleOtpInput nhưng dùng data-delete-otp-index)
function handleDeleteOtpInput(el){
  const value = (el.value || '').replace(/\D/g,'').slice(-1);
  el.value = value;
  const idx = Number(el.dataset.deleteOtpIndex || 0);
  const form = el.closest('form');
  if(!form) return;
  const next = form.querySelector(`input[data-delete-otp-index="${idx + 1}"]`);
  if(value && next){ next.focus(); }
}

function handleDeleteOtpKeydown(el, event){
  const idx = Number(el.dataset.deleteOtpIndex || 0);
  const form = el.closest('form');
  if(!form) return;
  if(event.key === 'Backspace' && !el.value && idx > 0){
    const prev = form.querySelector(`input[data-delete-otp-index="${idx - 1}"]`);
    if(prev){ prev.focus(); prev.value=''; }
  }
  if(event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
    const delta = event.key === 'ArrowLeft' ? -1 : 1;
    const target = form.querySelector(`input[data-delete-otp-index="${idx + delta}"]`);
    if(target){ event.preventDefault(); target.focus(); }
  }
}

function handleDeleteOtpPaste(event){
  const pasted = (event.clipboardData || window.clipboardData || {}).getData?.('text') || '';
  const digits = pasted.replace(/\D/g,'').slice(0,4);
  if(!digits) return;
  event.preventDefault();
  const form = event.target.closest('form');
  if(!form) return;
  const fields = Array.from(form.querySelectorAll('input[data-delete-otp-index]'));
  digits.split('').forEach((digit, index) => {
    if(fields[index]) fields[index].value = digit;
  });
  const target = fields[Math.min(digits.length, fields.length - 1)];
  if(target) target.focus();
}

export {
  openAuth, closeAuth, openCheckout, closeCheckout,
  rejectProductPrompt, closeRejectModal, openRating, closeRatingModal, setRatingStars, getRatingStars,
  cancelOrderPrompt, closeCancelModal, renderModals, closeModalsAndRefresh, showNotification, closeNotification,
  openDeleteProductModal, closeDeleteProductModal, openDeleteAccountModal, closeDeleteAccountModal
};
