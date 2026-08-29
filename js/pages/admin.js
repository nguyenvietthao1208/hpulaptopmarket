// ============================================================
// Trang quản trị: duyệt / từ chối / gỡ tin đăng.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, toast, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchAll, fetchDoc, notifyUser } from '../firestore-helpers.js';
import { doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { render } from '../router.js';
import { closeModalsAndRefresh } from '../modals.js';

async function pageAdmin(){
  setPageTitle('Quản trị');
  if(!state.currentUser || state.currentUser.role!=='admin') return `<div class="wrap section page-fade"><div class="empty">Chỉ quản trị viên mới truy cập được trang này.</div></div>`;
  const tab = state.route.params.tab || 'pending';
  const products = await fetchAll('products');
  const pending = products.filter(p=>p.status==='pending');
  const approved = products.filter(p=>['approved','reserved','sold'].includes(p.status));
  const rejected = products.filter(p=>p.status==='rejected');
  const list = tab==='pending'?pending:(tab==='approved'?approved:rejected);
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Quản trị'}])}
    <h2>Quản trị — Duyệt tin đăng</h2>
    <div class="tabbar">
      <a href="#" class="tab ${tab==='pending'?'active':''}" onclick="nav('admin',{tab:'pending'});return false;">Chờ duyệt (${pending.length})</a>
      <a href="#" class="tab ${tab==='approved'?'active':''}" onclick="nav('admin',{tab:'approved'});return false;">Đã duyệt (${approved.length})</a>
      <a href="#" class="tab ${tab==='rejected'?'active':''}" onclick="nav('admin',{tab:'rejected'});return false;">Từ chối (${rejected.length})</a>
    </div>
    ${list.length? list.map(p=>`<div class="order-card">
        <div class="order-top">
          <div><a href="#" onclick="nav('product',{id:'${p.id}'});return false;" style="font-weight:600;">${esc(p.title)}</a><div class="specstrip">${esc(p.cpu)} · ${fmtVND(p.price)}</div></div>
          <span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span>
        </div>
        <div class="specstrip">Người bán: ${esc(p.sellerName||'?')} · ${esc(p.contactPhone)} · ${esc(p.contactZone)}</div>
        ${p.status==='pending'? `<div class="order-actions">
          <button class="btn btn-primary btn-sm" onclick="approveProduct('${p.id}')">Duyệt</button>
          <button class="btn btn-danger btn-sm" onclick="rejectProductPrompt('${p.id}')">Từ chối</button>
        </div>`:''}
        ${p.status==='rejected'? `<div class="field hint" style="color:var(--danger);text-transform:none;">Lý do: ${esc(p.rejectReason||'')}</div>`:''}
        ${(p.status==='approved'||p.status==='reserved'||p.status==='sold')? `<div class="order-actions">
          <button class="btn btn-danger btn-sm" onclick="adminDeleteProduct('${p.id}')">Gỡ tin đăng</button>
        </div>`:''}
      </div>`).join('') : `<div class="empty">Không có tin nào ở mục này.</div>`}
  </div>`;
}

async function approveProduct(id){
  try{
    await updateDoc(doc(db,'products',id), { status:'approved' });
    const p = await fetchDoc('products', id);
    await notifyUser(p.sellerId, 'Tin đăng đã được duyệt', `Tin "${p.title}" của bạn đã được duyệt và hiển thị công khai trên HPU LaptopMarket.`, {page:'product', params:{id:p.id}});
    toast('Đã duyệt tin đăng.','success');
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

async function submitReject(e, id){
  e.preventDefault();
  try{
    const f=new FormData(e.target);
    const reason = f.get('reason').trim();
    await updateDoc(doc(db,'products',id), { status:'rejected', rejectReason:reason });
    const p = await fetchDoc('products', id);
    await notifyUser(p.sellerId, 'Tin đăng bị từ chối', `Tin "${p.title}" chưa được duyệt. Lý do: ${reason}`, {page:'mylistings', params:{}});
    toast('Đã từ chối tin đăng.');
    await closeModalsAndRefresh();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
  return false;
}

async function adminDeleteProduct(id){
  if(!confirm('Gỡ tin đăng này khỏi HPU LaptopMarket? Người bán sẽ được thông báo.')) return;
  try{
    const p = await fetchDoc('products', id);
    await deleteDoc(doc(db,'products',id));
    if(p) await notifyUser(p.sellerId, 'Tin đăng đã bị gỡ bởi quản trị viên', `Tin "${p.title}" của bạn đã bị quản trị viên gỡ khỏi HPU LaptopMarket.`, {page:'mylistings', params:{}});
    toast('Đã gỡ tin đăng.','success');
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

export { pageAdmin, approveProduct, submitReject, adminDeleteProduct };
