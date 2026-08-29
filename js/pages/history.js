// ============================================================
// Kho giao dịch đã hoàn tất: sản phẩm đã bán + bình luận/đánh giá công khai.
// ============================================================
import { STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, fmtDate, sortDesc, sortAsc, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchWhere, fetchAll } from '../firestore-helpers.js';

async function pageHistory(){
  setPageTitle('Kho giao dịch đã hoàn tất');
  const [products, comments, ratings] = await Promise.all([
    fetchWhere('products','status','==','sold'),
    fetchAll('comments'),
    fetchAll('ratings')
  ]);
  const sorted = sortDesc(products);
  const commentsByProduct = {};
  comments.forEach(c=>{ (commentsByProduct[c.productId]=commentsByProduct[c.productId]||[]).push(c); });
  const ratingsByProduct = {};
  ratings.forEach(r=>{ if(r.productId) (ratingsByProduct[r.productId]=ratingsByProduct[r.productId]||[]).push(r); });

  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Đã hoàn tất'}])}
    <span class="eyebrow">Lưu trữ</span>
    <h1 style="font-size:22px;">Kho giao dịch đã hoàn tất</h1>
    <p class="field hint" style="margin:6px 0 18px;">Toàn bộ sản phẩm đã giao dịch xong, cùng bình luận và đánh giá của mọi người.</p>
    ${sorted.length? sorted.map(p=>{
      const cs = sortAsc(commentsByProduct[p.id]||[]);
      const rs = sortDesc(ratingsByProduct[p.id]||[]);
      return `<div class="order-card">
        <div class="order-top">
          <div><a href="#" onclick="nav('product',{id:'${p.id}'});return false;" style="font-weight:600;">${esc(p.title)}</a><div class="specstrip">${esc(p.brand)} · ${fmtVND(p.price)} · Người bán: ${esc(p.sellerName||'?')}</div></div>
          <span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span>
        </div>
        ${rs.length? `<div class="divider" style="margin:12px 0;"></div><div class="field hint" style="text-transform:none;font-weight:600;color:var(--ink);margin-bottom:6px;">Đánh giá (${rs.length})</div>${rs.map(r=>`<div class="review-item"><div class="comment-head"><span class="comment-author">${esc(r.buyerName||'Ẩn danh')}</span><span class="comment-time">${fmtDate(r.createdAt)}</span></div><div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>${r.comment?`<div class="comment-body">${esc(r.comment)}</div>`:''}</div>`).join('')}`:''}
        ${cs.length? `<div class="divider" style="margin:12px 0;"></div><div class="field hint" style="text-transform:none;font-weight:600;color:var(--ink);margin-bottom:6px;">Bình luận (${cs.length})</div>${cs.map(c=>`<div class="comment"><div class="comment-head"><span class="comment-author">${esc(c.userName||'Ẩn danh')}</span><span class="comment-time">${fmtDate(c.createdAt)}</span></div><div class="comment-body">${esc(c.text)}</div>${c.type==='offer'?`<div class="offer-chip">Đề nghị giá: ${fmtVND(c.offerPrice)}</div>`:''}</div>`).join('')}`:''}
        ${!rs.length && !cs.length? `<p class="field hint" style="margin-top:10px;">Chưa có bình luận hay đánh giá nào cho giao dịch này.</p>`:''}
      </div>`;
    }).join('') : `<div class="empty">Chưa có giao dịch nào hoàn tất.</div>`}
  </div>`;
}

export { pageHistory };
