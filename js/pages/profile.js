// ============================================================
// Trang hồ sơ cá nhân: xem/sửa tên, SĐT, đổi ảnh đại diện.
// ============================================================
import { state } from '../state.js';
import { esc, avatarHtml, fmtDate, statsFromUser, toast, compressImage, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { render } from '../router.js';

let pendingAvatarFile = null; // File ảnh đại diện mới chọn (chưa lưu)

async function pageProfile(){
  setPageTitle('Hồ sơ cá nhân');
  if(!state.currentUser) return `<div class="wrap section page-fade"><div class="empty">Vui lòng đăng nhập.</div></div>`;
  pendingAvatarFile = null;
  const st = statsFromUser(state.currentUser);
  return `<div class="wrap section page-fade" style="max-width:640px;">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Hồ sơ cá nhân'}])}
    <span class="eyebrow">Hồ sơ cá nhân</span>
    <h1 style="font-size:22px;">Thông tin của bạn</h1>
    <div class="panel" style="margin-top:16px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;">
        <div id="avatar-preview">${avatarHtml(state.currentUser, 'width:72px;height:72px;font-size:24px;')}</div>
        <div>
          <label class="btn btn-ghost btn-sm" for="avatarInput" style="cursor:pointer;">Đổi ảnh đại diện</label>
          <input type="file" id="avatarInput" accept="image/*" style="display:none;" onchange="onAvatarSelected(this)">
          <p class="field hint" style="margin:6px 0 0;">JPG/PNG, ảnh sẽ được tự động nén nhỏ lại.</p>
        </div>
      </div>
      <div class="divider"></div>
      <p class="field hint" style="text-transform:none;">Email: <b style="color:var(--ink);">${esc(state.currentUser.email)}</b> (không thể đổi) · Tham gia ${fmtDate(state.currentUser.createdAt).split(' ')[0]}${st.completed?` · ${st.completed} đơn đã hoàn tất`:''}${st.reviewCount? ` · ★ ${st.avg.toFixed(1)} (${st.reviewCount} đánh giá)`:''}</p>
      <form onsubmit="return submitProfile(event)" style="margin-top:14px;">
        <div class="field"><label>Họ và tên *</label><input class="input" name="name" required value="${esc(state.currentUser.name)}"></div>
        <div class="field"><label>Số điện thoại</label><input class="input" name="phone" pattern="[0-9]{9,11}" value="${esc(state.currentUser.phone||'')}" placeholder="Chưa cập nhật"></div>
        <button class="btn btn-primary btn-block" type="submit">Lưu thay đổi</button>
      </form>
    </div>
  </div>`;
}

function onAvatarSelected(input){
  const file = (input.files||[])[0];
  if(!file) return;
  if(file.size > 8*1024*1024){ toast('Ảnh quá nặng, vui lòng chọn ảnh khác.','error'); input.value=''; return; }
  pendingAvatarFile = file;
  const prev = document.getElementById('avatar-preview');
  if(prev) prev.innerHTML = `<div class="seller-avatar" style="width:72px;height:72px;font-size:24px;padding:0;overflow:hidden;"><img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover;" alt="Ảnh đại diện xem trước"></div>`;
}

async function submitProfile(e){
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const originalLabel = btn.textContent;
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try{
    const f = new FormData(e.target);
    const patch = { name: f.get('name').trim(), phone: (f.get('phone')||'').trim() };
    if(pendingAvatarFile){
      patch.avatarUrl = await compressImage(pendingAvatarFile, 320, 0.8);
    }
    await updateDoc(doc(db,'users',state.currentUser.uid), patch);
    Object.assign(state.currentUser, patch);
    pendingAvatarFile = null;
    toast('Đã lưu hồ sơ.','success');
    await render();
  }catch(err){
    toast('Lỗi: '+err.message,'error');
    btn.disabled = false; btn.textContent = originalLabel;
  }
  return false;
}

export { pageProfile, onAvatarSelected, submitProfile };
