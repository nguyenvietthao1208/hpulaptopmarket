// ============================================================
// Router (điều hướng URL riêng cho từng trang) + khung trang (header, danh sách
// thông báo, khung xương khi tải dữ liệu) + các hàm điều hướng dùng chung.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from './state.js';
import { esc, fmtDate, avatarHtml, toast, runHeroCountUp, sortDesc } from './helpers.js';
import { db } from './firebase-init.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { openAuth } from './modals.js';

import { pageHome } from './pages/home.js';
import { pageProduct } from './pages/product.js';
import { pageSell, renderThumbs } from './pages/sell.js';
import { pageMyListings } from './pages/mylistings.js';
import { pageRemoved } from './pages/removed.js';
import { pageCart } from './pages/cart.js';
import { pageOrders } from './pages/orders.js';
import { pageAdmin } from './pages/admin.js';
import { pageSeller } from './pages/seller.js';
import { pageProfile } from './pages/profile.js';
import { pageLeaderboard } from './pages/leaderboard.js';
import { pageHistory } from './pages/history.js';
import { pageFaq } from './pages/faq.js';
import { pagePrivacy } from './pages/privacy.js';
import { pageNotFound } from './pages/notfound.js';

let notifOpen = false;
let mobileNavOpen = false;
let headerNotifCache = [];

function encodeRoute(page, params){
  const qs = new URLSearchParams(params||{}).toString();
  return '#/' + page + (qs ? '?'+qs : '');
}

function parseRouteFromLocation(){
  const raw = location.hash.replace(/^#\/?/, '');
  const [page, qs] = raw.split('?');
  const params = {};
  if(qs) new URLSearchParams(qs).forEach((v,k)=>{ params[k]=v; });
  return { page: page || 'home', params };
}

async function nav(page, params){
  state.route = { page, params: params||{} };
  notifOpen = false;
  const hash = encodeRoute(page, state.route.params);
  if(location.hash !== hash) history.pushState({page, params:state.route.params}, '', hash);
  trackPageView(hash);
  await render();
}

window.addEventListener('popstate', ()=>{ state.route = parseRouteFromLocation(); render(); trackPageView(location.hash); });
window.toggleMobileNav = toggleMobileNav;

function attachMobileNavListeners(){
  // No longer needed - onclick inline handler is sufficient
}

document.addEventListener('click', (event) => {
  const toggleBtn = event.target.closest('.mobile-nav-toggle');
  if(toggleBtn){
    return;
  }

  if(mobileNavOpen && !event.target.closest('.mobile-nav-sheet') && !event.target.closest('.mobile-nav-toggle')){
    mobileNavOpen = false;
    toggleMobileNav(false);
  }
});

// Google Analytics (GA4) không tự theo dõi chuyển trang trong SPA (chỉ theo dõi lần
// tải trang đầu tiên), nên cần gửi sự kiện page_view thủ công mỗi khi đổi route.
// Nếu chưa cấu hình GA (window.gtag không tồn tại), hàm này tự bỏ qua, không lỗi gì.
function trackPageView(hashPath){
  if(typeof window.gtag === 'function'){
    window.gtag('event', 'page_view', { page_path: hashPath || '#/home', page_location: location.href });
  }
}

async function render(){
  await renderHeader();
  await renderPage();
  window.scrollTo(0,0);
}

function requireLogin(){
  if(!state.currentUser){ openAuth('login'); toast('Vui lòng đăng nhập trước.'); return false; }
  return true;
}

async function goSell(){ if(requireLogin()) await nav('sell'); }

async function goMyListings(){ if(requireLogin()) await nav('mylistings'); }

async function goOrders(){ if(requireLogin()) await nav('orders', {tab:'buy'}); }

// Bật/tắt panel thông báo — CHỈ render lại header (nhẹ, không đụng nội dung
// trang, không scroll, không reload). Panel tự đóng khi bấm ra ngoài (xem
// listener ở dưới).
async function toggleNotif(){
  notifOpen = !notifOpen;
  await renderHeader();
}

function toggleMobileNav(force){
  const next = typeof force === 'boolean' ? force : !mobileNavOpen;
  mobileNavOpen = next;

  const toggle = document.querySelector('.mobile-nav-toggle');
  const sheet = document.querySelector('.mobile-nav-sheet');
  const overlay = document.querySelector('.mobile-nav-sheet-overlay');
  
  if(toggle){
    toggle.classList.toggle('open', next);
    toggle.textContent = next ? '✕' : '☰';
    toggle.setAttribute('aria-label', next ? 'Đóng menu' : 'Mở menu');
  }
  if(sheet){
    sheet.classList.toggle('open', next);
  }
  if(overlay){
    overlay.classList.toggle('open', next);
  }
  
  // Ngăn scroll body khi menu mở
  document.body.style.overflow = next ? 'hidden' : '';
}

// Đóng panel thông báo khi bấm ra ngoài vùng panel/nút thông báo
document.addEventListener('click', (e) => {
  const target = e.target;
  const notifWrap = document.querySelector('.notif-wrap');

  if(notifOpen && notifWrap && !target.closest('.notif-wrap')){ 
    notifOpen = false;
    renderHeader();
  }
});

async function renderHeader(){
  const root = document.getElementById('header-root');
  let cartCount = 0, unread = 0;
  if(state.currentUser){
    // Đếm CHỈ những sản phẩm trong giỏ CÒN TỒN TẠI (ID có trong state.products).
    // Nếu cart chứa ID sản phẩm đã bị xóa/gỡ → tự dọn dẹp khỏi Firestore.
    const cartIds = state.currentUser.cart || [];
    const productIds = new Set((state.products || []).map(p => p.id));
    const validIds = cartIds.filter(id => productIds.has(id));
    cartCount = validIds.length;
    if(validIds.length !== cartIds.length){
      // Có ID rác (sản phẩm đã bị xóa) — dọn dẹp im lặng
      cleanupCart(cartIds, validIds);
    }
    // Dùng state.notifications (đã được realtime cập nhật) thay vì fetch lại Firestore
    const notifs = state.notifications || [];
    headerNotifCache = sortDesc(notifs).slice(0,15);
    unread = notifs.filter(n=>!n.read).length;
  } else {
    headerNotifCache = [];
  }
  const navItems = `
    <a class="nav-link ${state.route.page==='home'?'active':''}" href="#" onclick="nav('home');return false;">Trang chủ</a>
    <a class="nav-link ${state.route.page==='sell'?'active':''}" href="#" onclick="goSell();return false;">Đăng bán</a>
    <a class="nav-link ${state.route.page==='mylistings'?'active':''}" href="#" onclick="goMyListings();return false;">Tin đăng của tôi</a>
    <a class="nav-link ${state.route.page==='orders'?'active':''}" href="#" onclick="goOrders();return false;">Đơn hàng</a>
    <a class="nav-link ${state.route.page==='leaderboard'?'active':''}" href="#" onclick="nav('leaderboard');return false;">Xếp hạng</a>
    <a class="nav-link ${state.route.page==='history'?'active':''}" href="#" onclick="nav('history');return false;">Đã hoàn tất</a>
    ${state.currentUser && state.currentUser.role==='admin' ? `<a class="nav-link ${state.route.page==='admin'?'active':''}" href="#" onclick="nav('admin');return false;">Quản trị</a>` : ''}
  `;

  root.innerHTML = `
    <a href="#" class="brand" onclick="nav('home');return false;">
      <span class="brand-mark"></span>
      <span class="brand-name">HPU <b>LM</b></span>
    </a>
    <button class="mobile-nav-toggle ${mobileNavOpen?'open':''}" type="button" aria-label="${mobileNavOpen ? 'Đóng menu' : 'Mở menu'}" onclick="event.stopPropagation(); window.toggleMobileNav(); return false;">${mobileNavOpen ? '✕' : '☰'}</button>
    <nav class="nav-links">${navItems}</nav>
    <div class="topbar-right">
      <button class="btn btn-ghost btn-sm" onclick="toggleDarkMode()" title="Chuyển đổi Dark/Light Mode" aria-label="Chuyển đổi Dark/Light Mode">${state.darkMode ? '☀' : '☾'}</button>
      ${state.currentUser ? `
        <button class="btn btn-ghost btn-sm mobile-notif-btn" onclick="event.stopPropagation();toggleNotif();return false;" title="Thông báo" aria-label="Thông báo">
          🔔${unread ? `<span class="count-pill">${unread}</span>` : ''}
        </button>
        ${notifOpen ? `<div class="mobile-notif-panel">${renderNotifPanel()}</div>` : ''}
      ` : ''}
      <button class="btn btn-ghost btn-sm mobile-cart-btn" onclick="nav('cart');return false;" title="Giỏ hàng" aria-label="Giỏ hàng">
        🛒${cartCount ? `<span class="count-pill">${cartCount}</span>` : ''}
      </button>
      <a href="#" class="nav-link cart-link" onclick="nav('cart');return false;">Giỏ hàng${cartCount?`<span class="count-pill">${cartCount}</span>`:''}</a>
      ${state.currentUser?`
      <div class="notif-wrap">
        <a href="#" class="nav-link" onclick="event.stopPropagation();toggleNotif();return false;">Thông báo${unread?`<span class="count-pill">${unread}</span>`:''}</a>
        ${notifOpen?renderNotifPanel():''}
      </div>
      <a href="#" onclick="nav('profile');return false;" style="display:flex;align-items:center;gap:7px;text-decoration:none;">
        ${avatarHtml(state.currentUser, 'width:26px;height:26px;font-size:10.5px;')}
        <span class="user-chip">${esc(state.currentUser.name)} <span>· ${state.currentUser.role==='admin'?'Quản trị':'Thành viên'}</span></span>
      </a>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Đăng xuất</button>
      `:`
      <button class="btn btn-ghost btn-sm" onclick="openAuth('login')">Đăng nhập</button>
      <button class="btn btn-primary btn-sm" onclick="openAuth('register')">Đăng ký</button>
      `}
    </div>
  `;

  // Tạo side menu (nằm ngoài header, ở mức body)
  let sideMenu = document.querySelector('.mobile-nav-sheet');
  let overlay = document.querySelector('.mobile-nav-sheet-overlay');
  
  // Tạo nội dung menu với auth buttons
  const mobileMenuContent = `
    <div class="mobile-nav-header">
      <span>Trang chủ</span>
    </div>
    ${navItems}
    <div class="mobile-nav-divider"></div>
    ${state.currentUser ? `
      <a href="#" class="nav-link nav-link-user" onclick="nav('profile');return false;">
        <span class="nav-user-avatar">
          ${state.currentUser.name.charAt(0).toUpperCase()}
        </span>
        ${esc(state.currentUser.name)}
      </a>
      <button class="nav-link nav-link-logout" onclick="logout()">
        Đăng xuất
      </button>
    ` : `
      <button class="nav-link nav-link-auth" onclick="openAuth('login');return false;">
        Đăng nhập
      </button>
      <button class="nav-link nav-link-auth" onclick="openAuth('register');return false;">
        Đăng ký
      </button>
    `}
  `;
  
  if(!sideMenu){
    sideMenu = document.createElement('div');
    sideMenu.className = `mobile-nav-sheet ${mobileNavOpen?'open':''}`;
    sideMenu.innerHTML = mobileMenuContent;
    document.body.insertBefore(sideMenu, document.querySelector('main'));
  } else {
    sideMenu.innerHTML = mobileMenuContent;
    sideMenu.className = `mobile-nav-sheet ${mobileNavOpen?'open':''}`;
  }
  
  if(!overlay){
    overlay = document.createElement('div');
    overlay.className = 'mobile-nav-sheet-overlay';
    overlay.onclick = (e) => { if(mobileNavOpen) { mobileNavOpen = false; toggleMobileNav(false); } };
    document.body.insertBefore(overlay, sideMenu);
  }
  
  // Thêm click handler cho các nav link
  document.querySelectorAll('.mobile-nav-sheet .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileNavOpen = false;
      toggleMobileNav(false);
    });
  });

  attachMobileNavListeners();
}

// Dọn dẹp cart chứa ID sản phẩm không còn tồn tại (đã bị xóa/gỡ bởi admin).
// Chạy ngầm, không làm phiền người dùng.
async function cleanupCart(staleIds, validIds){
  try{
    await updateDoc(doc(db,'users',state.currentUser.uid), { cart: validIds });
  }catch(err){ /* im lặng — sẽ dọn lại ở lần render sau */ }
}

function renderNotifPanel(){
  if(!headerNotifCache.length) return `<div class="notif-panel"><div class="notif-empty">Chưa có thông báo nào.</div></div>`;
  return `<div class="notif-panel">${headerNotifCache.map(n=>`
    <a href="#" class="notif-item" style="display:block;text-decoration:none;color:inherit;cursor:pointer;" onclick="notifClick(event,'${n.id}')">
      <div class="t">${esc(n.title)}${!n.read?' <span class="badge-inline">Mới</span>':''}</div>
      <div class="m">${esc(n.message)}</div>
      <div class="d">${fmtDate(n.createdAt)}</div>
    </a>`).join('')}</div>`;
}

async function notifClick(e, notifId){
  e.preventDefault();
  const n = headerNotifCache.find(x=>x.id===notifId);
  try{ await updateDoc(doc(db,'notifications',notifId), {read:true}); }catch(err){}
  notifOpen = false;
  if(n && n.link && n.link.page){
    await nav(n.link.page, n.link.params||{});
  } else {
    await render();
  }
}

function skeletonFor(page){
  if(page==='home' || page==='seller'){
    return `<div class="wrap"><div class="skeleton-grid">${Array.from({length:6}).map(()=>`
      <div class="skeleton-card">
        <div class="skel skel-media"></div>
        <div class="skel skel-line w60"></div>
        <div class="skel skel-line w40"></div>
      </div>`).join('')}</div></div>`;
  }
  return `<div class="wrap section"><div class="skel skel-line w40" style="margin-left:0;height:22px;"></div><div class="skel skel-line w60" style="margin-left:0;margin-top:18px;height:80px;border-radius:12px;"></div></div>`;
}

// Sinh HTML cho trang hiện tại (dùng chung cho renderPage và renderPageSmooth)
async function buildPageHtml(){
  switch(state.route.page){
    case 'home': return await pageHome();
    case 'product': return await pageProduct(state.route.params.id);
    case 'sell': return await pageSell();
    case 'mylistings': return await pageMyListings();
    case 'removed': return await pageRemoved();
    case 'cart': return await pageCart();
    case 'orders': return await pageOrders();
    case 'admin': return await pageAdmin();
    case 'seller': return await pageSeller(state.route.params.id);
    case 'profile': return await pageProfile();
    case 'leaderboard': return await pageLeaderboard();
    case 'history': return await pageHistory();
    case 'faq': return await pageFaq();
    case 'privacy': return await pagePrivacy();
    default: return pageNotFound();
  }
}

async function renderPage(showSkeleton = true){
  const app = document.getElementById('app');
  if(showSkeleton) app.innerHTML = skeletonFor(state.route.page);
  let html = '';
  try{
    html = await buildPageHtml();
  }catch(err){
    console.error(err);
    html = `<div class="wrap section page-fade"><div class="empty">Có lỗi khi tải dữ liệu: ${esc(err.message)}<br><span class="field hint">Kiểm tra lại cấu hình trong js/firebase-config.js, và đảm bảo đã bật Firestore + áp dụng đúng Security Rules.</span></div></div>`;
  }
  app.innerHTML = html;
  if(state.route.page==='sell') renderThumbs();
  if(state.route.page==='home') runHeroCountUp();
  updateStickyCta();
}

// Cập nhật trang theo kiểu "tự nhiên, nhẹ nhàng" — so sánh HTML mới với DOM cũ,
// CHỈ thay thế những section thực sự thay đổi; phần không đổi giữ nguyên tuyệt đối
// (ảnh không tải lại, vị trí cuộn không nhảy, input không mất trạng thái).
// Section được thay sẽ có hiệu ứng fade nhẹ giống skeleton thay vì nhấp nháy cả trang.
async function renderPageSmooth(){
  const app = document.getElementById('app');
  if(!app) return false;
  let html = '';
  try{
    html = await buildPageHtml();
  }catch(err){
    console.error(err);
    html = `<div class="wrap section page-fade"><div class="empty">Có lỗi khi tải dữ liệu: ${esc(err.message)}</div></div>`;
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  const oldChildren = Array.from(app.children);
  const newChildren = Array.from(temp.children);

  let changed = false;
  const maxLen = Math.max(oldChildren.length, newChildren.length);
  for(let i = 0; i < maxLen; i++){
    const oldEl = oldChildren[i];
    const newEl = newChildren[i];
    if(oldEl && newEl && oldEl.outerHTML === newEl.outerHTML) continue;
    changed = true;
    if(!newEl){
      oldEl.classList.add('section-fade-out');
      setTimeout(() => oldEl.remove(), 220);
      continue;
    }
    if(!oldEl){
      newEl.classList.add('section-fade-in');
      app.appendChild(newEl);
      continue;
    }

    newEl.classList.add('section-fade-in');
    oldEl.classList.add('section-fade-out');
    app.insertBefore(newEl, oldEl.nextSibling || null);
    setTimeout(() => oldEl.remove(), 220);
  }

  if(changed){
    if(state.route.page==='sell') renderThumbs();
    if(state.route.page==='home') runHeroCountUp();
    updateStickyCta();
  }
  return changed;
}

// Thanh CTA dính đáy màn hình trên di động — ẩn khi đang ở trang Đăng bán
// (vì lúc đó nút "Đăng bán ngay" không còn ý nghĩa).
function updateStickyCta(){
  const el = document.getElementById('sticky-mobile-cta');
  if(!el) return;
  el.classList.toggle('show', state.route.page !== 'sell');
}

function toggleDarkMode(){
  state.darkMode = !state.darkMode;
  if(state.darkMode){
    document.body.classList.add('dark-mode');
    localStorage.setItem('hpulm-theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('hpulm-theme', 'light');
  }
}

// Khởi tạo dark mode từ localStorage khi tải trang
function initDarkMode(){
  if(state.darkMode) document.body.classList.add('dark-mode');
}

export {
  nav, render, renderHeader, renderPage, renderPageSmooth, requireLogin, goSell, goMyListings, goOrders, toggleNotif,
  notifClick, parseRouteFromLocation, toggleDarkMode, initDarkMode
};
