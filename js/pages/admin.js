// ============================================================
// Trang quản trị: duyệt / từ chối / gỡ tin đăng.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, fmtDate, toast, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchAll, fetchDoc, notifyUser } from '../firestore-helpers.js';
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { render } from '../router.js';
import { closeModalsAndRefresh, openDeleteProductModal } from '../modals.js';
import { pageAdminAnalytics } from './admin-analytics.js';

async function pageAdmin(){
  setPageTitle('Quản trị');
  if(!state.currentUser || state.currentUser.role!=='admin') return `<div class="wrap section page-fade"><div class="empty">Chỉ quản trị viên mới truy cập được trang này.</div></div>`;
  const tab = state.route.params.tab || 'pending';
  if(tab === 'analytics') return pageAdminAnalytics();
  if(tab === 'history') return pageAdminHistory();
  // Dùng state.products (được realtime.js cập nhật liên tục) — admin thấy tin
  // mới chờ duyệt ngay lập tức khi có người đăng, không cần tải lại trang.
  const products = state.products || [];
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
      <a href="#" class="tab ${tab==='history'?'active':''}" onclick="nav('admin',{tab:'history'});return false;">Lịch sử gỡ bài</a>
      <a href="#" class="tab ${tab==='analytics'?'active':''}" onclick="nav('admin',{tab:'analytics'});return false;">Dashboard</a>
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
          <button class="btn btn-danger btn-sm" onclick="openDeleteProductModal('${p.id}')">Gỡ tin đăng</button>
        </div>`:''}
      </div>`).join('') : `<div class="empty">Không có tin nào ở mục này.</div>`}
  </div>`;
}

// Trang lịch sử gỡ bài cho admin — xem toàn bộ các lần gỡ
async function pageAdminHistory(){
  const history = await fetchAll('productHistory');
  const sorted = history.sort((a, b) => (b.timestamp?.toDate?.() || new Date(0)) - (a.timestamp?.toDate?.() || new Date(0)));
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Quản trị', page:'admin'}, {label:'Lịch sử gỡ bài'}])}
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <span class="eyebrow">Admin History</span>
        <h2>Lịch sử gỡ bài đăng</h2>
      </div>
      <a href="#" class="btn btn-ghost btn-sm" onclick="nav('admin');return false;">Quay lại duyệt tin</a>
    </div>
    ${sorted.length? sorted.map(h=>`<div class="order-card">
      <div class="order-top">
        <div>
          <div style="font-weight:600;font-size:15px;">${esc(h.productTitle)}</div>
          <div class="specstrip">${esc(h.productPrice ? fmtVND(h.productPrice) : '?')} · Người bán: ${esc(h.sellerName||'?')}</div>
        </div>
        <span class="asset-tag" style="background:var(--danger-bg);color:var(--danger);">ĐÃ GỠ</span>
      </div>
      <div class="specstrip" style="margin:10px 0;color:var(--ink-soft);font-size:13px;">
        ${fmtDate(h.timestamp)} · Admin: ${esc(h.adminName||'Hệ thống')}
      </div>
      <div style="background:var(--danger-bg);padding:12px;border-radius:8px;font-size:13px;color:var(--danger);line-height:1.5;">
        <strong>Lý do gỡ:</strong> ${esc(h.reason||'(không có lý do)')}
      </div>
    </div>`).join('') : `<div class="empty">Chưa có lịch sử gỡ bài nào.</div>`}
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
    if(p) await notifyUser(p.sellerId, 'Tin đăng đã bị gỡ bởi quản trị viên', `Tin "${p.title}" của bạn đã bị quản trị viên gỡ khỏi HPU LaptopMarket. Bấm vào để xem chi tiết.`, {page:'removed', params:{}});
    toast('Đã gỡ tin đăng.','success');
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

async function submitDeleteProduct(e, id){
  e.preventDefault();
  try{
    const f = new FormData(e.target);
    const reason = f.get('reason').trim();
    if(!reason) { toast('Vui lòng nhập lý do gỡ tin.', 'error'); return false; }
    
    const p = await fetchDoc('products', id);
    
    // Lưu lịch sử gỡ tin
    await addDoc(collection(db, 'productHistory'), {
      productId: id,
      productTitle: p.title,
      productPrice: p.price,
      action: 'deleted_by_admin',
      reason: reason,
      adminId: state.currentUser.uid,
      adminName: state.currentUser.name,
      sellerId: p.sellerId,
      sellerName: p.sellerName,
      timestamp: serverTimestamp(),
    });
    
    // Xóa sản phẩm
    await deleteDoc(doc(db, 'products', id));
    
    // Gửi thông báo cho người bán — bấm vào sẽ tới trang "Lịch sử gỡ bài" để xem chi tiết
    if(p) await notifyUser(p.sellerId, 'Tin đăng đã bị gỡ bởi quản trị viên', 
      `Tin "${p.title}" đã bị gỡ khỏi HPU LaptopMarket.\n\nLý do: ${reason}\n\nBấm vào để xem chi tiết.`, 
      {page:'removed', params:{}});
    
    toast('Đã gỡ tin đăng và lưu vào lịch sử.','success');
    await closeModalsAndRefresh();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
  return false;
}

export { pageAdmin, approveProduct, submitReject, adminDeleteProduct, submitDeleteProduct };
