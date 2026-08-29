// ============================================================
// Bảng xếp hạng người bán theo điểm đánh giá, có tìm kiếm theo tên.
// "leaderboardQuery"/"leaderboardAllSellers" là state riêng của trang này.
// ============================================================
import { esc, avatarHtml, statsFromUser, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchAll } from '../firestore-helpers.js';
import { nav } from '../router.js';

let leaderboardQuery = '';

let leaderboardAllSellers = [];

async function pageLeaderboard(){
  setPageTitle('Bảng xếp hạng người bán');
  const [users, products] = await Promise.all([ fetchAll('users'), fetchAll('products') ]);
  // "Người bán" = bất kỳ ai từng đăng ít nhất 1 tin (kể cả admin, nếu admin cũng dùng tài
  // khoản đó để bán) HOẶC đã có đơn hoàn tất / có đánh giá. Không lọc theo role nữa —
  // trước đây loại hẳn tài khoản admin khỏi bảng xếp hạng khiến admin bán hàng thật cũng
  // bị ẩn, gây khó hiểu.
  const sellerIds = new Set(products.map(p=>p.sellerId));
  let sellers = users.filter(u=> sellerIds.has(u.id) || (u.dealsCompleted||0)>0 || (u.ratingCount||0)>0);
  sellers = sellers.map(u=>({ u, st: statsFromUser(u) }));
  sellers.sort((a,b)=>{
    if(b.st.avg !== a.st.avg) return b.st.avg - a.st.avg;
    if(b.st.reviewCount !== a.st.reviewCount) return b.st.reviewCount - a.st.reviewCount;
    return b.st.completed - a.st.completed;
  });
  // Lưu lại danh sách đầy đủ để lọc trực tiếp trên trình duyệt khi gõ tìm kiếm,
  // không cần render lại cả trang (giữ nguyên con trỏ trong ô nhập).
  leaderboardAllSellers = sellers;
  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Bảng xếp hạng'}])}
    <span class="eyebrow">Uy tín cộng đồng</span>
    <h1 style="font-size:22px;">Bảng xếp hạng người bán</h1>
    <p class="field hint" style="margin:6px 0 18px;">Xếp theo điểm đánh giá trung bình, sau đó theo số lượt đánh giá và số đơn đã hoàn tất.</p>
    <div class="field" style="max-width:340px;">
      <input class="input" placeholder="Tìm người bán theo tên... (Enter để làm mới)" value="${esc(leaderboardQuery)}"
        oninput="onLeaderboardSearchInput(this.value)"
        onkeydown="if(event.key==='Enter'){ event.preventDefault(); render(); }">
    </div>
    <div id="leaderboard-results">${renderLeaderboardList(filterLeaderboardSellers(leaderboardAllSellers, leaderboardQuery))}</div>
  </div>`;
}

function filterLeaderboardSellers(list, q){
  if(!q) return list;
  const ql = q.toLowerCase();
  return list.filter(s=>(s.u.name||'').toLowerCase().includes(ql));
}

function renderLeaderboardList(sellers){
  if(!sellers.length) return `<div class="empty">Không tìm thấy người bán phù hợp.</div>`;
  return sellers.map((s,i)=>`
    <a href="#" onclick="nav('seller',{id:'${s.u.id}'});return false;" style="text-decoration:none;color:inherit;">
      <div class="order-card" style="display:flex;align-items:center;gap:14px;">
        <div class="mono" style="width:26px;text-align:center;font-weight:700;color:${i<3?'var(--amber-dark)':'var(--ink-soft)'};">${i+1}</div>
        ${avatarHtml(s.u, 'width:42px;height:42px;font-size:15px;')}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;">${esc(s.u.name)}</div>
          <div class="specstrip">${s.st.reviewCount? `<span class="stars">★ ${s.st.avg.toFixed(1)}</span><span>${s.st.reviewCount} lượt đánh giá</span>` : `<span>Chưa có đánh giá</span>`}<span>${s.st.completed} đơn đã hoàn tất</span></div>
        </div>
      </div>
    </a>`).join('');
}

function onLeaderboardSearchInput(v){
  leaderboardQuery = v;
  const results = document.getElementById('leaderboard-results');
  if(results) results.innerHTML = renderLeaderboardList(filterLeaderboardSellers(leaderboardAllSellers, leaderboardQuery));
}

export { pageLeaderboard, onLeaderboardSearchInput };
