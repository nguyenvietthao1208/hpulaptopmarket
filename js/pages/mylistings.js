// ============================================================
// Trang "Tin đăng của tôi": danh sách tin của người bán hiện tại + xóa tin
// (chỉ khi đang chờ duyệt hoặc bị từ chối).
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, sortDesc, toast, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchWhere } from '../firestore-helpers.js';
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { render } from '../router.js';

async function pageMyListings(){
  setPageTitle('Tin đăng của tôi');
  if(!state.currentUser) return `<div class="wrap section page-fade"><div class="empty">Vui lòng đăng nhập.</div></div>`;
  const mine = sortDesc(await fetchWhere('products','sellerId','==',state.currentUser.uid));
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Tin đăng của tôi'}])}
    <div class="section-head"><h2>Tin đăng của tôi</h2><button class="btn btn-primary btn-sm" onclick="goSell()">+ Đăng bán mới</button></div>
    ${mine.length? mine.map(p=>`
      <div class="order-card">
        <div class="order-top">
          <div><a href="#" onclick="nav('product',{id:'${p.id}'});return false;" style="font-weight:600;">${esc(p.title)}</a><div class="specstrip">${fmtVND(p.price)}</div></div>
          <span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span>
        </div>
        ${p.status==='rejected'? `<div class="field hint" style="color:var(--danger);text-transform:none;">Lý do từ chối: ${esc(p.rejectReason||'')}</div>`:''}
        ${(p.status==='pending'||p.status==='rejected')? `<div class="order-actions"><button class="btn btn-danger btn-sm" onclick="deleteListing('${p.id}')">Xóa tin</button></div>`:''}
      </div>`).join('') : `<div class="empty">Bạn chưa có tin đăng nào.</div>`}
  </div>`;
}

async function deleteListing(id){
  if(!confirm('Bạn có chắc muốn xóa tin đăng này?')) return;
  try{
    await deleteDoc(doc(db,'products',id));
    toast('Đã xóa tin đăng.');
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

export { pageMyListings, deleteListing };
