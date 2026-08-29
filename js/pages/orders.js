// ============================================================
// Đơn hàng: danh sách đơn mua/bán, luồng trạng thái, đặt hàng, xác nhận,
// giao hàng, hoàn tất, hủy đơn, đánh giá người bán.
// ============================================================
import { state, STATUS_LABEL, ORDER_LABEL, ORDER_STEPS } from '../state.js';
import { esc, fmtVND, fmtDate, toast, sortDesc, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchAll, fetchWhere, fetchDoc, notifyUser } from '../firestore-helpers.js';
import {
  addDoc, collection, doc, updateDoc, arrayUnion, arrayRemove, Timestamp, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { sendOrderEmail } from '../email.js';
import { nav, render } from '../router.js';
import { closeCheckout, closeModalsAndRefresh, getRatingStars } from '../modals.js';

async function pageOrders(){
  setPageTitle('Đơn hàng');
  if(!state.currentUser) return `<div class="wrap section page-fade"><div class="empty">Vui lòng đăng nhập.</div></div>`;
  const tab = state.route.params.tab || 'buy';
  const [list, ratings] = await Promise.all([
    tab==='buy' ? fetchWhere('orders','buyerId','==',state.currentUser.uid) : fetchWhere('orders','sellerId','==',state.currentUser.uid),
    fetchAll('ratings')
  ]);
  const sorted = sortDesc(list);
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Đơn hàng'}])}
    <h2>Đơn hàng</h2>
    <div class="tabbar">
      <a href="#" class="tab ${tab==='buy'?'active':''}" onclick="nav('orders',{tab:'buy'});return false;">Đơn tôi đã mua</a>
      <a href="#" class="tab ${tab==='sell'?'active':''}" onclick="nav('orders',{tab:'sell'});return false;">Đơn tôi đã bán</a>
    </div>
    ${sorted.length? sorted.map(o=>orderCard(o,tab,ratings)).join('') : `<div class="empty">Chưa có đơn hàng nào ở mục này.</div>`}
  </div>`;
}

function orderCard(o, tab, ratings){
  const cancelled = o.status==='cancelled';
  const already = ratings.find(r=>r.orderId===o.id);
  let stepperHtml = '';
  if(cancelled){
    stepperHtml = `<div class="step-cancelled">Đơn hàng đã bị hủy${o.cancelReason?': '+esc(o.cancelReason):''}</div>`;
  } else {
    const idx = ORDER_STEPS.indexOf(o.status);
    stepperHtml = `<div class="stepper">${ORDER_STEPS.map((s,i)=>`
      <div class="step ${i<idx?'done':(i===idx?'current':'')}">
        <div class="step-dot">${i+1}</div>
        <div class="step-label">${ORDER_LABEL[s]}</div>
      </div>`).join('')}</div>`;
  }
  let actions = '';
  if(!cancelled){
    if(tab==='sell'){
      if(o.status==='pending') actions += `<button class="btn btn-primary btn-sm" onclick="sellerConfirm('${o.id}')">Xác nhận đơn</button>`;
      if(o.status==='confirmed') actions += `<button class="btn btn-primary btn-sm" onclick="sellerShip('${o.id}')">Chuyển sang đang giao</button>`;
      if(o.status==='pending'||o.status==='confirmed') actions += `<button class="btn btn-danger btn-sm" onclick="cancelOrderPrompt('${o.id}')">Hủy đơn</button>`;
    } else {
      if(o.status==='shipping') actions += `<button class="btn btn-primary btn-sm" onclick="buyerConfirmReceived('${o.id}')">Đã nhận được hàng</button>`;
      if(o.status==='pending') actions += `<button class="btn btn-danger btn-sm" onclick="cancelOrderPrompt('${o.id}')">Hủy đơn</button>`;
      if(o.status==='completed' && !already) actions += `<button class="btn btn-amber btn-sm" onclick="openRating('${o.id}')">Đánh giá người bán</button>`;
    }
  }
  return `<div class="order-card">
    <div class="order-top">
      <div><a href="#" onclick="nav('product',{id:'${o.productId}'});return false;" style="font-weight:600;">${esc(o.productTitle||'(sản phẩm)')}</a><div class="specstrip">Mã đơn ${o.id} · ${fmtVND(o.price)}</div></div>
      <div class="specstrip">${tab==='sell'? 'Người mua: '+esc(o.buyerName||'?') : 'Người bán: '+esc(o.sellerName||'?')}</div>
    </div>
    ${stepperHtml}
    <div class="specstrip">Người nhận: ${esc(o.buyerContact.name)} · ${esc(o.buyerContact.phone)} · ${esc(o.buyerContact.address)}</div>
    ${already? `<div class="field hint" style="text-transform:none;margin-top:8px;">Bạn đã đánh giá: <span class="stars">${'★'.repeat(already.stars)}${'☆'.repeat(5-already.stars)}</span> — "${esc(already.comment)}"</div>`:''}
    ${actions? `<div class="order-actions">${actions}</div>`:''}
  </div>`;
}

async function submitOrder(e, productId){
  e.preventDefault();
  try{
    const f = new FormData(e.target);
    const p = await fetchDoc('products', productId);
    if(!p || p.status!=='approved'){ toast('Sản phẩm này hiện không thể đặt mua.','error'); await closeModalsAndRefresh(); return false; }
    const seller = await fetchDoc('users', p.sellerId);
    const orderData = {
      productId, productTitle:p.title, buyerId:state.currentUser.uid, buyerName:state.currentUser.name,
      sellerId:p.sellerId, sellerName: seller?seller.name:'', price:p.price,
      buyerContact:{ name:f.get('name').trim(), phone:f.get('phone').trim(), address:f.get('address').trim(), note:(f.get('note')||'').trim() },
      status:'pending', history:[{status:'pending', at: Timestamp.now()}], createdAt: serverTimestamp()
    };
    const orderRef = await addDoc(collection(db,'orders'), orderData);
    await updateDoc(doc(db,'products',productId), { status:'reserved' });
    await updateDoc(doc(db,'users',state.currentUser.uid), { cart: arrayRemove(productId) });
    state.currentUser.cart = (state.currentUser.cart||[]).filter(x=>x!==productId);
    await notifyUser(p.sellerId, 'Có đơn đặt mua mới', `${state.currentUser.name} vừa đặt mua "${p.title}".`, {page:'orders', params:{tab:'sell'}});
    if(seller && seller.email){
      await sendOrderEmail({
        to_email: seller.email, to_name: seller.name,
        product_title: p.title, price: fmtVND(p.price),
        buyer_name: orderData.buyerContact.name, buyer_phone: orderData.buyerContact.phone,
        buyer_address: orderData.buyerContact.address, order_id: orderRef.id
      });
    }
    toast('Đặt mua thành công! Người bán sẽ sớm xác nhận.','success');
    closeCheckout();
    await nav('orders',{tab:'buy'});
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
  return false;
}

async function sellerConfirm(id){
  try{
    await updateDoc(doc(db,'orders',id), { status:'confirmed', history: arrayUnion({status:'confirmed', at: Timestamp.now()}) });
    const o = await fetchDoc('orders', id);
    await notifyUser(o.buyerId, 'Đơn hàng đã được xác nhận', 'Người bán đã xác nhận đơn của bạn, chuẩn bị giao hàng.', {page:'orders', params:{tab:'buy'}});
    toast('Đã xác nhận đơn hàng.','success'); await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

async function sellerShip(id){
  try{
    await updateDoc(doc(db,'orders',id), { status:'shipping', history: arrayUnion({status:'shipping', at: Timestamp.now()}) });
    const o = await fetchDoc('orders', id);
    await notifyUser(o.buyerId, 'Đơn hàng đang được giao', 'Đơn hàng của bạn đang trên đường giao tới.', {page:'orders', params:{tab:'buy'}});
    toast('Đã chuyển trạng thái sang đang giao.','success'); await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

async function buyerConfirmReceived(id){
  try{
    await updateDoc(doc(db,'orders',id), { status:'completed', history: arrayUnion({status:'completed', at: Timestamp.now()}) });
    const o = await fetchDoc('orders', id);
    await updateDoc(doc(db,'products',o.productId), { status:'sold' });
    await updateDoc(doc(db,'users',o.sellerId), { dealsCompleted: increment(1) });
    await notifyUser(o.sellerId, 'Người mua đã xác nhận nhận hàng', 'Đơn hàng đã hoàn tất. Cảm ơn bạn đã giao dịch trên HPU LaptopMarket.', {page:'orders', params:{tab:'sell'}});
    toast('Đã xác nhận nhận hàng. Đơn hoàn tất!','success'); await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
}

async function submitCancel(e, orderId){
  e.preventDefault();
  try{
    const f = new FormData(e.target);
    const reason = f.get('reason').trim();
    const o = await fetchDoc('orders', orderId);
    await updateDoc(doc(db,'orders',orderId), { status:'cancelled', cancelReason:reason });
    const p = await fetchDoc('products', o.productId);
    if(p && p.status==='reserved') await updateDoc(doc(db,'products',o.productId), { status:'approved' });
    const otherId = (state.currentUser.uid===o.buyerId) ? o.sellerId : o.buyerId;
    await notifyUser(otherId, 'Đơn hàng đã bị hủy', `Đơn hàng #${o.id} đã bị hủy. Lý do: ${reason}`, {page:'orders', params:{tab: otherId===o.buyerId?'buy':'sell'}});
    toast('Đã hủy đơn hàng.');
    await closeModalsAndRefresh();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
  return false;
}

async function submitRating(e, orderId){
  e.preventDefault();
  try{
    const f = new FormData(e.target);
    const existing = await fetchWhere('ratings','orderId','==',orderId);
    if(existing.length){ toast('Bạn đã đánh giá đơn này rồi.'); await closeModalsAndRefresh(); return false; }
    const o = await fetchDoc('orders', orderId);
    await addDoc(collection(db,'ratings'), {
      orderId, productId:o.productId, productTitle:o.productTitle, sellerId:o.sellerId, buyerId:o.buyerId, buyerName: state.currentUser.name,
      stars: getRatingStars(), comment:(f.get('comment')||'').trim(), createdAt: serverTimestamp()
    });
    await updateDoc(doc(db,'users',o.sellerId), { ratingSum: increment(getRatingStars()), ratingCount: increment(1) });
    await notifyUser(o.sellerId, 'Bạn nhận được đánh giá mới', `${state.currentUser.name} vừa đánh giá ${getRatingStars()} sao cho đơn hàng #${o.id}.`, {page:'seller', params:{id:o.sellerId}});
    toast('Cảm ơn bạn đã đánh giá!','success');
    await closeModalsAndRefresh();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
  return false;
}

export { pageOrders, orderCard, submitOrder, sellerConfirm, sellerShip, buyerConfirmReceived, submitCancel, submitRating };
