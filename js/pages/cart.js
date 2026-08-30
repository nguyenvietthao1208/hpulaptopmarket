// ============================================================
// Giỏ hàng: xem/xóa sản phẩm trong giỏ, thêm vào giỏ từ trang chi tiết sản phẩm.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, toast, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchDoc } from '../firestore-helpers.js';
import { doc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { render, requireLogin } from '../router.js';

async function pageCart(){
  setPageTitle('Giỏ hàng');
  if(!state.currentUser) return `<div class="wrap section page-fade"><div class="empty">Vui lòng đăng nhập để xem giỏ hàng.</div></div>`;
  // Dùng state.products (realtime) — chỉ hiện sản phẩm CÒN TỒN TẠI trong giỏ.
  // ID của sản phẩm đã bị xóa/gỡ sẽ tự được loại bỏ (và được renderHeader dọn dẹp).
  const ids = state.currentUser.cart||[];
  const productMap = new Map((state.products || []).map(p => [p.id, p]));
  const items = ids.map(id => productMap.get(id)).filter(Boolean);
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Giỏ hàng'}])}
    <h2>Giỏ hàng (${items.length})</h2>
    ${items.length? items.map(p=>`
      <div class="order-card">
        <div class="order-top">
          <div><a href="#" onclick="nav('product',{id:'${p.id}'});return false;" style="font-weight:600;">${esc(p.title)}</a><div class="card-price">${fmtVND(p.price)}</div></div>
          <span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span>
        </div>
        <div class="order-actions">
          <button class="btn btn-primary btn-sm" ${p.status==='approved'?'':'disabled'} onclick="openCheckout('${p.id}')">Mua ngay</button>
          <button class="btn btn-ghost btn-sm" onclick="removeFromCart('${p.id}')">Xóa khỏi giỏ</button>
        </div>
      </div>`).join('') : `<div class="empty">Giỏ hàng trống. <a class="linklike" href="#" onclick="nav('home');return false;">Khám phá máy đang bán</a></div>`}
  </div>`;
}

async function addToCart(id){
  if(!requireLogin()) return;
  const p = await fetchDoc('products', id);
  if(!p || p.status!=='approved'){ toast('Sản phẩm không khả dụng.','error'); return; }
  if((state.currentUser.cart||[]).includes(id)){ toast('Sản phẩm đã có trong giỏ hàng.'); return; }
  try{
    await updateDoc(doc(db,'users',state.currentUser.uid), { cart: arrayUnion(id) });
    toast('Đã thêm vào giỏ hàng.','success');
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

async function removeFromCart(id){
  try{
    await updateDoc(doc(db,'users',state.currentUser.uid), { cart: arrayRemove(id) });
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

export { pageCart, addToCart, removeFromCart };
