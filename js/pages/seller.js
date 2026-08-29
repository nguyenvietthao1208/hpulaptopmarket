// ============================================================
// Trang hồ sơ công khai của người bán: thống kê uy tín, danh sách đang bán,
// đánh giá từ người mua.
// ============================================================
import { esc, fmtDate, avatarHtml, sortDesc, statsFromUser, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchDoc, fetchWhere } from '../firestore-helpers.js';
import { productCard } from './home.js';

async function pageSeller(id){
  const seller = await fetchDoc('users', id);
  if(!seller) return `<div class="wrap section page-fade"><div class="empty">Không tìm thấy người dùng.</div></div>`;
  setPageTitle(seller.name);
  const [ratings, allProducts] = await Promise.all([
    fetchWhere('ratings','sellerId','==',id),
    fetchWhere('products','sellerId','==',id)
  ]);
  const st = statsFromUser(seller);
  const usersById = { [id]: seller };
  const listings = allProducts.filter(p=>['approved','reserved','sold'].includes(p.status));
  const sortedReviews = sortDesc(ratings);
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Bảng xếp hạng', page:'leaderboard'}, {label:seller.name}])}
    <div class="seller-box" style="padding:20px;">
      ${avatarHtml(seller, 'width:52px;height:52px;font-size:18px;')}
      <div class="seller-meta">
        <div class="name" style="font-size:16px;">${esc(seller.name)}</div>
        <div class="sub">Tham gia ${fmtDate(seller.createdAt).split(' ')[0]} · ${st.completed} đơn đã hoàn tất ${st.reviewCount?`· ★ ${st.avg.toFixed(1)} (${st.reviewCount} đánh giá)`:'· Chưa có đánh giá'}</div>
      </div>
    </div>
    <div class="divider"></div>
    <h3>Đang bán (${listings.length})</h3>
    ${listings.length? `<div class="grid">${listings.map(p=>productCard(p, usersById)).join('')}</div>`:`<div class="empty">Chưa có tin đang bán.</div>`}
    <div class="divider"></div>
    <h3>Đánh giá từ người mua (${sortedReviews.length})</h3>
    ${sortedReviews.length? sortedReviews.map(r=>`<div class="review-item"><div class="comment-head"><span class="comment-author">${esc(r.buyerName||'Ẩn danh')}</span><span class="comment-time">${fmtDate(r.createdAt)}</span></div><div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div><div class="comment-body">${esc(r.comment)}</div></div>`).join(''): `<p class="field hint">Chưa có đánh giá nào.</p>`}
  </div>`;
}

export { pageSeller };
