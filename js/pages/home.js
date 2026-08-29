// ============================================================
// Trang chủ: danh sách sản phẩm, tìm kiếm & lọc. "filters" là state riêng
// của trang này — không cần chia sẻ với file khác.
// ============================================================
import { STATUS_LABEL, STATUS_CLASS } from '../state.js';
import { esc, fmtVND, sortDesc, buildUsersById, statsFromUser, setPageTitle } from '../helpers.js';
import { fetchAll } from '../firestore-helpers.js';
import { render } from '../router.js';

let filters = { q:'', brand:'', min:'', max:'', condition:'', showSold:false };

async function pageHome(){
  setPageTitle();
  const [products, users] = await Promise.all([ fetchAll('products'), fetchAll('users') ]);
  const usersById = buildUsersById(users);
  const totalCompletedDeals = users.reduce((a,u)=>a+(u.dealsCompleted||0),0);

  let list = products.filter(p=> p.status==='approved' || p.status==='reserved' || (filters.showSold && p.status==='sold'));
  if(filters.q){ const q=filters.q.toLowerCase(); list = list.filter(p=> (p.title+' '+p.brand+' '+p.cpu).toLowerCase().includes(q)); }
  if(filters.brand){ list = list.filter(p=>p.brand===filters.brand); }
  if(filters.min){ list = list.filter(p=>p.price>=Number(filters.min)); }
  if(filters.max){ list = list.filter(p=>p.price<=Number(filters.max)); }
  if(filters.condition){ list = list.filter(p=>p.condition===filters.condition); }
  list = sortDesc(list);

  const brands = [...new Set(products.map(p=>p.brand))].sort();
  const conditions = [...new Set(products.map(p=>p.condition))];
  const totalListed = products.filter(p=>p.status!=='pending'&&p.status!=='rejected').length;
  const userCount = users.filter(u=>u.role!=='admin').length;
  const completedOrders = totalCompletedDeals;

  return `
  <div class="hero"><div class="wrap hero-inner">
    <span class="eyebrow">Chợ laptop cũ dành cho sinh viên HPU</span>
    <h1 class="hero-title">Mua bán laptop cũ trong cộng đồng sinh viên Trường Đại học Hải Phòng, mỗi tin đăng đều được admin kiểm tra trước khi lên kệ.</h1>
    <p class="hero-sub">Người bán khai đầy đủ cấu hình và liên hệ thật, người mua xem lịch sử uy tín trước khi chốt đơn.</p>
    <div class="hero-stats">
      <div class="hero-stat"><b data-count="${totalListed}">0</b><span>Tin đã duyệt</span></div>
      <div class="hero-stat"><b data-count="${userCount}">0</b><span>Người dùng</span></div>
      <div class="hero-stat"><b data-count="${completedOrders}">0</b><span>Đơn hoàn tất</span></div>
    </div>
  </div></div>
  <div class="wrap section page-fade">
    <div class="filterbar">
      <div class="filterbar-grid">
        <div class="field"><label>Từ khóa</label><input class="input" value="${esc(filters.q)}" placeholder="Tên máy, hãng, CPU..." oninput="setFilter('q',this.value)"></div>
        <div class="field"><label>Hãng</label><select class="select" onchange="setFilter('brand',this.value)"><option value="">Tất cả</option>${brands.map(b=>`<option value="${esc(b)}" ${filters.brand===b?'selected':''}>${esc(b)}</option>`).join('')}</select></div>
        <div class="field"><label>Giá từ</label><input class="input" type="number" value="${esc(filters.min)}" oninput="setFilter('min',this.value)" placeholder="vd: 5000000"></div>
        <div class="field"><label>Giá đến</label><input class="input" type="number" value="${esc(filters.max)}" oninput="setFilter('max',this.value)" placeholder="vd: 15000000"></div>
        <div class="field"><button class="btn btn-primary btn-block" onclick="render()">Lọc</button></div>
      </div>
      <div class="check-row" style="margin-top:12px;">
        <select class="select" style="width:auto;" onchange="setFilter('condition',this.value);render()">
          <option value="">Tất cả tình trạng</option>
          ${conditions.map(c=>`<option value="${esc(c)}" ${filters.condition===c?'selected':''}>${esc(c)}</option>`).join('')}
        </select>
        <input type="checkbox" id="f-sold" ${filters.showSold?'checked':''} onchange="setFilter('showSold',this.checked);render()">
        <label for="f-sold" style="margin:0;text-transform:none;font-weight:400;">Hiện cả tin đã bán</label>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="resetFilters()">Xóa lọc</button>
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
  <a href="#" class="card" onclick="nav('product',{id:'${p.id}'});return false;">
    <div class="card-media">
      <div class="card-status"><span class="asset-tag ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span></div>
      ${hasImg? `<img class="real" src="${esc(p.images[0])}" alt="${esc(p.title)}">` : `
      <div class="card-media-mono">${esc(p.brand)}<br>${esc(secondLine)}</div>
      <div class="card-media-sub mono">${esc(p.condition)}</div>`}
    </div>
    <div class="card-body">
      <div class="card-title">${esc(p.title)}</div>
      <div class="specstrip"><span>${esc(p.cpu)}</span><span>${esc(p.ram)}</span><span>${esc(p.storage)}</span><span>${esc(p.screen)}</span></div>
      <div class="card-price">${fmtVND(p.price)}</div>
      <div class="card-seller">Người bán: <b>${esc(seller?seller.name:'?')}</b> ${st.reviewCount? `· <span class="stars">★${st.avg.toFixed(1)}</span> (${st.reviewCount})`:'· <span style="color:var(--ink-soft)">Chưa có đánh giá</span>'}</div>
    </div>
  </a>`;
}

function setFilter(key, val){ filters[key] = val; }

function resetFilters(){ filters = {q:'',brand:'',min:'',max:'',condition:'',showSold:false}; render(); }

export { pageHome, productCard, setFilter, resetFilters };
