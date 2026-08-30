// ============================================================
// Trang chi tiết sản phẩm: thông tin, ảnh, người bán, bình luận & trả giá.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, fmtDate, avatarHtml, initials, sortAsc, statsFromUser, copyText, toast, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchDoc, fetchWhere, notifyUser } from '../firestore-helpers.js';
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { render } from '../router.js';

async function pageProduct(id){
  const p = await fetchDoc('products', id);
  if(!p) return `<div class="wrap section page-fade"><div class="empty">Không tìm thấy sản phẩm.</div></div>`;
  const seller = await fetchDoc('users', p.sellerId);
  const comments = await fetchWhere('comments','productId','==',id);
  const st = statsFromUser(seller);
  const sortedComments = sortAsc(comments);
  const isOwner = state.currentUser && state.currentUser.uid===p.sellerId;
  const canBuy = p.status==='approved' && !isOwner;
  const hasImg = p.images && p.images.length;
  setPageTitle(p.title);

  return `
  <div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:p.brand||'Sản phẩm', page:'home'}, {label:p.title}])}
    <div class="detail-grid" style="margin-top:16px;">
      <div>
        <div class="detail-media">
          ${hasImg? `<img class="real" id="detail-main-img" src="${esc(p.images[0])}" alt="${esc(p.title)}">` : `<div class="detail-media-mono">${esc(p.brand)}<br>${esc(p.title)}</div>`}
        </div>
        ${hasImg && p.images.length>1? `<div class="detail-media-strip">${p.images.map((u,i)=>`<img src="${esc(u)}" alt="${esc(p.title)} - ảnh ${i+1}" onclick="document.getElementById('detail-main-img').src='${esc(u)}'">`).join('')}</div>`:''}
      </div>
      <div>
        <span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span>
        <h1 style="margin-top:10px;font-size:23px;">${esc(p.title)}</h1>
        <div class="card-price" style="font-size:22px;margin-top:8px;">${fmtVND(p.price)}</div>
        <table class="spec-table">
          <tr><td>CPU</td><td>${esc(p.cpu)}</td></tr>
          <tr><td>RAM</td><td>${esc(p.ram)}</td></tr>
          <tr><td>Ổ lưu trữ</td><td>${esc(p.storage)}</td></tr>
          <tr><td>Màn hình</td><td>${esc(p.screen)}</td></tr>
          <tr><td>GPU</td><td>${esc(p.gpu || 'Không có')}</td></tr>
          <tr><td>Tình trạng</td><td>${esc(p.condition)}</td></tr>
          <tr><td>Khu vực</td><td>${esc(p.contactZone||'—')}</td></tr>
        </table>
        <p style="color:var(--ink-soft);font-size:13.5px;">${esc(p.description)}</p>
        ${p.status==='rejected' && isOwner ? `<div class="empty" style="text-align:left;border-color:var(--danger-bg);color:var(--danger);">Lý do từ chối: ${esc(p.rejectReason||'')}</div>`:''}
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
          <button class="btn btn-primary" ${canBuy?'':'disabled'} onclick="openCheckout('${p.id}')">Mua ngay</button>
          <button class="btn btn-ghost" ${canBuy?'':'disabled'} onclick="addToCart('${p.id}')">Thêm vào giỏ hàng</button>
        </div>
        ${isOwner? `<p class="field hint" style="margin-top:10px;">Đây là tin đăng của bạn nên không thể tự mua.</p>`:''}
        <div class="divider"></div>
        <a href="#" onclick="nav('seller',{id:'${seller?seller.id:''}'});return false;">
          <div class="seller-box">
            ${avatarHtml(seller)}
            <div class="seller-meta">
              <div class="name">${esc(seller?seller.name:'Người dùng đã ẩn')}</div>
              <div class="sub">${st.reviewCount? `★ ${st.avg.toFixed(1)} · ${st.reviewCount} đánh giá · `:''}${st.completed} đơn đã hoàn tất${state.currentUser && seller? ` · ${esc(seller.phone||'chưa cập nhật SĐT')}`:''}${state.currentUser&&seller&&seller.phone? `<button type="button" class="copy-btn" onclick="event.preventDefault();event.stopPropagation();copyText('${esc(seller.phone)}',this)">Sao chép SĐT</button>`:''}</div>
            </div>
          </div>
        </a>
        ${!state.currentUser? `<p class="field hint">Đăng nhập để xem số điện thoại người bán.</p>`:''}
      </div>
    </div>

    <div class="divider"></div>
    <h3>Bình luận &amp; trao đổi (${sortedComments.length})</h3>
    <div style="max-width:640px;">
      ${sortedComments.map(c=>`<div class="comment">
          <div class="comment-head"><span class="comment-author">${esc(c.userName||'Ẩn danh')}</span><span class="comment-time">${fmtDate(c.createdAt)}</span></div>
          <div class="comment-body">${esc(c.text)}</div>
          ${c.type==='offer'? `<div class="offer-chip">Đề nghị giá: ${fmtVND(c.offerPrice)}</div>`:''}
        </div>`).join('') || `<p class="field hint">Chưa có bình luận nào — hãy là người đầu tiên hỏi về sản phẩm này.</p>`}
    </div>
    ${state.currentUser? `
    <form onsubmit="return submitComment(event,'${p.id}')" style="max-width:640px;margin-top:14px;">
      <div class="field"><textarea class="textarea" name="text" placeholder="Đặt câu hỏi hoặc để lại bình luận..." required></textarea></div>
      ${!isOwner? `<div class="check-row" style="margin-bottom:12px;"><input type="checkbox" id="isoffer" onchange="document.getElementById('offerprice-wrap').style.display=this.checked?'block':'none'"><label for="isoffer" style="margin:0;text-transform:none;font-weight:400;">Đây là một đề nghị trả giá</label></div>
      <div class="field" id="offerprice-wrap" style="display:none;"><label>Mức giá đề nghị (đ)</label><input class="input" type="number" name="offerPrice" placeholder="vd: 5000000"></div>`:''}
      <button class="btn btn-primary" type="submit">Gửi</button>
    </form>`: `<p class="field hint" style="margin-top:10px;">Đăng nhập để bình luận hoặc trả giá.</p>`}
  </div>`;
}

async function submitComment(e, productId){
  e.preventDefault();
  try{
    const f = new FormData(e.target);
    const offEl = document.getElementById('isoffer');
    const isOffer = !!(offEl && offEl.checked && f.get('offerPrice') && Number(f.get('offerPrice'))>0);
    const payload = {
      productId, userId: state.currentUser.uid, userName: state.currentUser.name,
      text: f.get('text').trim(), type: isOffer?'offer':'comment', createdAt: serverTimestamp()
    };
    if(isOffer) payload.offerPrice = Number(f.get('offerPrice'));
    await addDoc(collection(db,'comments'), payload);
    const p = await fetchDoc('products', productId);
    if(p && p.sellerId!==state.currentUser.uid) await notifyUser(p.sellerId, 'Bình luận mới trên tin đăng của bạn', `${state.currentUser.name}: "${payload.text}"`, {page:'product', params:{id:productId}});
    await render();
  }catch(err){ toast('Lỗi: '+err.message,'error'); }
  return false;
}

export { pageProduct, submitComment };
