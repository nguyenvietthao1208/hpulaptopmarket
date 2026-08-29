// ============================================================
// Trang xem lịch sử sản phẩm bị gỡ bởi admin
// ============================================================
import { state } from '../state.js';
import { esc, fmtVND, fmtDate, setPageTitle, renderBreadcrumbs, toast } from '../helpers.js';
import { fetchWhere } from '../firestore-helpers.js';

async function pageRemoved(){
  setPageTitle('Lịch sử gỡ bài');
  if(!state.currentUser) return `<div class="wrap section page-fade"><div class="empty">Vui lòng đăng nhập để xem lịch sử.</div></div>`;
  
  try{
    const history = await fetchWhere('productHistory', 'sellerId', '==', state.currentUser.uid);
    const sorted = history.sort((a, b) => (b.timestamp?.toDate?.() || new Date(0)) - (a.timestamp?.toDate?.() || new Date(0)));
    
    return `<div class="wrap section page-fade">
      ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Lịch sử gỡ bài'}])}
      <h2>Lịch sử gỡ bài của bạn</h2>
      ${sorted.length ? sorted.map(h=>`<div class="order-card">
        <div class="order-top">
          <div>
            <div style="font-weight:600;font-size:15px;">${esc(h.productTitle)}</div>
            <div class="specstrip">${esc(h.productPrice ? fmtVND(h.productPrice) : '?')}</div>
          </div>
          <span class="asset-tag" style="background:var(--danger-bg);color:var(--danger);">GỠ BỞI ADMIN</span>
        </div>
        <div class="specstrip" style="margin:10px 0;color:var(--ink-soft);font-size:13px;">
          ${fmtDate(h.timestamp)} · Quản trị viên: ${esc(h.adminName||'Hệ thống')}
        </div>
        <div style="background:var(--danger-bg);padding:12px;border-radius:8px;font-size:13px;color:var(--danger);line-height:1.5;">
          <strong>Lý do gỡ:</strong> ${esc(h.reason||'(không có lý do)')}
        </div>
      </div>`).join('') : `<div class="empty">Bạn chưa có bài đăng nào bị gỡ. Tốt lắm! 👍</div>`}
    </div>`;
  }catch(err){
    toast('Lỗi: '+err.message, 'error');
    return `<div class="wrap section page-fade"><div class="empty">Lỗi tải dữ liệu.</div></div>`;
  }
}

export { pageRemoved };
