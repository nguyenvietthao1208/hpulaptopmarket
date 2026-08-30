// ============================================================
// Trang chủ: danh sách sản phẩm, tìm kiếm & lọc. "filters" là state riêng
// của trang này — không cần chia sẻ với file khác.
// Sản phẩm lấy từ state.products (được realtime.js cập nhật liên tục),
// nên khi có tin mới/được duyệt, trang tự cập nhật mà không cần reload.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, sortDesc, buildUsersById, statsFromUser, setPageTitle } from '../helpers.js';
import { fetchAll } from '../firestore-helpers.js';
import { render, renderPageSmooth } from '../router.js';

let filters = { q:'', brand:'', min:'', max:'', condition:'', showSold:false, sort:'newest' };
let mobileFiltersOpen = false;

function handleSearchInput(value){
  setFilter('q', value);
}

function toggleMobileFilters(force){
  const panel = document.querySelector('.filterbar-body');
  if(!panel) return;
  const next = typeof force === 'boolean' ? force : !mobileFiltersOpen;
  mobileFiltersOpen = next;
  panel.classList.toggle('open', next);
  panel.setAttribute('aria-expanded', String(next));
  const trigger = document.querySelector('.mobile-filter-button');
  if(trigger){
    trigger.textContent = next ? 'Đóng bộ lọc' : 'Bộ lọc';
    trigger.classList.toggle('active', next);
    trigger.setAttribute('aria-expanded', String(next));
  }
}

function commitSearchInput(value){
  setFilter('q', value);
  renderPageSmooth();
}

function applyFilters(){
  renderPageSmooth();
}

async function pageHome(){
  setPageTitle();
  const products = state.products || [];
  const users = await fetchAll('users');
  const usersById = buildUsersById(users);
  const totalCompletedDeals = users.reduce((a,u)=>a+(u.dealsCompleted||0),0);
  const latestProducts = [...products]
    .filter(p => p.status === 'approved' || p.status === 'reserved' || p.status === 'sold')
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  const latestProduct = latestProducts[0] || null;
  const latestSeller = latestProduct ? usersById[latestProduct.sellerId] : null;
  const latestSellerStats = latestSeller ? statsFromUser(latestSeller) : { avg: 0, reviewCount: 0 };

  let list = products.filter(p=> p.status==='approved' || p.status==='reserved' || (filters.showSold && p.status==='sold'));
  if(filters.q){ const q=filters.q.toLowerCase(); list = list.filter(p=> (p.title+' '+p.brand+' '+p.cpu).toLowerCase().includes(q)); }
  if(filters.brand){ list = list.filter(p=>p.brand===filters.brand); }
  if(filters.min){ list = list.filter(p=>p.price>=Number(filters.min)); }
  if(filters.max){ list = list.filter(p=>p.price<=Number(filters.max)); }
  if(filters.condition){ list = list.filter(p=>p.condition===filters.condition); }
  // Sắp xếp theo lựa chọn của người dùng
  const sort = filters.sort || 'newest';
  if(sort === 'price-asc'){ list = list.slice().sort((a,b)=>a.price-b.price); }
  else if(sort === 'price-desc'){ list = list.slice().sort((a,b)=>b.price-a.price); }
  else if(sort === 'title-asc'){ list = list.slice().sort((a,b)=>(a.title||'').localeCompare(b.title||'', 'vi')); }
  else { list = sortDesc(list); } // newest (mặc định)

  const brands = [...new Set(products.map(p=>p.brand))].sort();
  const conditions = [...new Set(products.map(p=>p.condition))];
  const totalListed = products.filter(p=>p.status!=='pending'&&p.status!=='rejected').length;
  const userCount = users.filter(u=>u.role!=='admin').length;
  const completedOrders = totalCompletedDeals;

  return `
  <div class="hero tech-marketplace-hero"><div class="wrap hero-inner">
    <div class="hero-copy">
      <span class="eyebrow">Chợ laptop cũ dành cho sinh viên HPU</span>
      <h1 class="hero-title">Mua bán laptop cũ trong cộng đồng sinh viên HPU — nhanh, rõ ràng, đáng tin cậy.</h1>
      <p class="hero-sub">Người bán mô tả chi tiết cấu hình, người mua xem đánh giá uy tín và giao dịch an toàn trong hệ thống đã kiểm duyệt.</p>
      <div class="hero-actions">
        <button class="btn btn-ghost" onclick="nav('privacy')">Chính sách bảo mật</button>
        <button class="btn btn-ghost" onclick="nav('faq')">Câu hỏi thường gặp</button>
        <button class="btn btn-primary" onclick="goSell()">+ Đăng bán</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b data-count="${totalListed}">0</b><span>Tin đã duyệt</span></div>
        <div class="hero-stat"><b data-count="${userCount}">0</b><span>Người dùng</span></div>
        <div class="hero-stat"><b data-count="${completedOrders}">0</b><span>Đơn hoàn tất</span></div>
      </div>
    </div>
    <div class="hero-panel">
      <div class="panel-badge">Marketplace · Live</div>
      <div class="mini-market-card market-card-top">
        <div class="market-product-meta">
          <span class="mini-label">Sản phẩm mới nhất</span>
          <h3>${latestProduct ? esc(latestProduct.title) : 'Chưa có sản phẩm mới'}</h3>
          <div class="market-seller-row">
            <span>${latestSeller ? esc(latestSeller.name) : 'Người bán'}</span>
            ${latestSellerStats.reviewCount ? `<span class="stars">★ ${latestSellerStats.avg.toFixed(1)}</span> (${latestSellerStats.reviewCount})` : '<span class="seller-muted">Chưa có đánh giá</span>'}
          </div>
        </div>
        <span class="price-tag">${latestProduct ? fmtVND(latestProduct.price) : 'Liên hệ'}</span>
      </div>
      <div class="market-stats-grid">
        <div class="market-stat"><span>CPU</span><strong>${latestProduct ? esc(latestProduct.cpu || '—') : '—'}</strong></div>
        <div class="market-stat"><span>RAM</span><strong>${latestProduct ? esc(latestProduct.ram || '—') : '—'}</strong></div>
        <div class="market-stat"><span>SSD</span><strong>${latestProduct ? esc(latestProduct.storage || '—') : '—'}</strong></div>
        <div class="market-stat"><span>GPU</span><strong>${latestProduct ? esc(latestProduct.gpu || 'Không có') : '—'}</strong></div>
      </div>
      <div class="market-mini-row">
        <div class="market-pill">${latestProduct ? esc(latestProduct.condition || 'Tình trạng') : 'Đang cập nhật'}</div>
        <div class="market-pill muted">${latestProduct ? esc(latestProduct.brand || 'Laptop') : 'Chưa có'}</div>
      </div>
    </div>
  </div></div>
  <div class="wrap section page-fade">
    <div class="filterbar">
      <div class="filterbar-top">
        <div class="filterbar-title">
          <span class="eyebrow">Bộ lọc</span>
          <strong>Khám phá máy</strong>
        </div>
        <div class="filterbar-actions">
          <button class="btn btn-ghost btn-sm mobile-filter-button" type="button" onclick="toggleMobileFilters()">Bộ lọc</button>
          <button class="btn btn-ghost btn-sm" type="button" onclick="resetFilters()">Xóa lọc</button>
        </div>
      </div>
      <div class="filterbar-body ${mobileFiltersOpen ? 'open' : ''}">
        <div class="filterbar-grid">
          <div class="field"><label>Từ khóa</label><input class="input" value="${esc(filters.q)}" placeholder="Tên máy, hãng, CPU..." oninput="handleSearchInput(this.value)" onkeydown="if(event.key==='Enter'){ event.preventDefault(); commitSearchInput(this.value); }" onblur="commitSearchInput(this.value)"></div>
          <div class="field"><label>Hãng</label><select class="select" onchange="setFilter('brand',this.value)"><option value="">Tất cả</option>${brands.map(b=>`<option value="${esc(b)}" ${filters.brand===b?'selected':''}>${esc(b)}</option>`).join('')}</select></div>
          <div class="field"><label>Giá từ</label><input class="input" type="number" value="${esc(filters.min)}" onchange="setFilter('min',this.value)" placeholder="vd: 5000000"></div>
          <div class="field"><label>Giá đến</label><input class="input" type="number" value="${esc(filters.max)}" onchange="setFilter('max',this.value)" placeholder="vd: 15000000"></div>
          <div class="field"><label>Sắp xếp</label>
            <select class="select" onchange="setFilter('sort',this.value);renderPageSmooth()">
              <option value="newest" ${filters.sort==='newest'?'selected':''}>Mới nhất</option>
              <option value="price-asc" ${filters.sort==='price-asc'?'selected':''}>Giá thấp → cao</option>
              <option value="price-desc" ${filters.sort==='price-desc'?'selected':''}>Giá cao → thấp</option>
              <option value="title-asc" ${filters.sort==='title-asc'?'selected':''}>Tên A → Z</option>
            </select>
          </div>
        </div>
        <div class="check-row" style="margin-top:12px;">
          <select class="select" style="width:auto;" onchange="setFilter('condition',this.value)">
            <option value="">Tất cả tình trạng</option>
            ${conditions.map(c=>`<option value="${esc(c)}" ${filters.condition===c?'selected':''}>${esc(c)}</option>`).join('')}
          </select>
          <input type="checkbox" id="f-sold" ${filters.showSold?'checked':''} onchange="setFilter('showSold',this.checked)">
          <label for="f-sold" style="margin:0;text-transform:none;font-weight:400;">Hiện cả tin đã bán</label>
          <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="applyFilters()">Lọc</button>
        </div>
      </div>
    </div>
    <div class="section-head"><h2>${list.length} máy đang hiển thị</h2></div>
    ${list.length? `<div class="grid">${list.map(p=>productCard(p, usersById)).join('')}</div>` : `<div class="empty">Không tìm thấy máy phù hợp với bộ lọc hiện tại.</div>`}
  </div>`;
}

function productCard(p, usersById){
  const seller = usersById[p.sellerId];
  const st = statsFromUser(seller);
  const secondLine = (p.title||'').replace(p.brand||'','').trim() || p.title;
  const hasImg = p.images && p.images.length;
  return `
  <a href="#" class="card card-live" data-product-id="${esc(p.id)}" onclick="nav('product',{id:'${p.id}'});return false;">
    <div class="card-media">
      <div class="card-status"><span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span></div>
      ${hasImg? `<img class="real" src="${esc(p.images[0])}" alt="${esc(p.title)}">` : `
      <div class="card-media-mono">${esc(p.brand)}<br>${esc(secondLine)}</div>
      <div class="card-media-sub mono">${esc(p.condition)}</div>`}
    </div>
    <div class="card-body">
      <div class="card-title">${esc(p.title)}</div>
      <div class="specstrip"><span>${esc(p.cpu)}</span><span>${esc(p.ram)}</span><span>${esc(p.storage)}</span><span>${esc(p.screen)}</span>${p.gpu ? `<span>${esc(p.gpu)}</span>` : ''}</div>
      <div class="card-price">${fmtVND(p.price)}</div>
      <div class="card-seller">Người bán: <b>${esc(seller?seller.name:'?')}</b> ${st.reviewCount? `· <span class="stars">★${st.avg.toFixed(1)}</span> (${st.reviewCount})`:'· <span style="color:var(--ink-soft)">Chưa có đánh giá</span>'}</div>
    </div>
  </a>`;
}

function setFilter(key, val){ filters[key] = val; }

function resetFilters(){
  filters = {q:'',brand:'',min:'',max:'',condition:'',showSold:false,sort:'newest'};
  renderPageSmooth();
}

if (typeof window !== 'undefined') {
  window.handleSearchInput = handleSearchInput;
  window.commitSearchInput = commitSearchInput;
  window.applyFilters = applyFilters;
  window.setFilter = setFilter;
  window.resetFilters = resetFilters;
  window.toggleMobileFilters = toggleMobileFilters;
}

export { pageHome, productCard, setFilter, resetFilters, handleSearchInput, commitSearchInput, applyFilters, toggleMobileFilters };
