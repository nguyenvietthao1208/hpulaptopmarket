// ============================================================
// Router (điều hướng URL riêng cho từng trang) + khung trang (header, danh sách
// thông báo, khung xương khi tải dữ liệu) + các hàm điều hướng dùng chung.
// ============================================================
import { state, STATUS_LABEL, STATUS_CLASS } from './state.js';
import { esc, fmtDate, avatarHtml, toast, runHeroCountUp, sortDesc } from './helpers.js';
import { fetchWhere } from './firestore-helpers.js';
import { db } from './firebase-init.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { openAuth } from './modals.js';

import { pageHome } from './pages/home.js';
import { pageProduct } from './pages/product.js';
import { pageSell, renderThumbs } from './pages/sell.js';
import { pageMyListings } from './pages/mylistings.js';
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

async function toggleNotif(){
  notifOpen = !notifOpen;
  await render();
}

async function renderHeader(){
  const root = document.getElementById('header-root');
  let cartCount = 0, unread = 0;
  if(state.currentUser){
    cartCount = (state.currentUser.cart||[]).length;
    try{
      const notifs = await fetchWhere('notifications','userId','==',state.currentUser.uid);
      headerNotifCache = sortDesc(notifs).slice(0,15);
      unread = notifs.filter(n=>!n.read).length;
    }catch(err){ headerNotifCache = []; }
  } else {
    headerNotifCache = [];
  }
  root.innerHTML = `
    <a href="#" class="brand" onclick="nav('home');return false;">
      <span class="brand-mark"></span>
      <span class="brand-name">HPU <b>LM</b></span>
    </a>
    <nav class="nav-links">
      <a class="nav-link ${state.route.page==='home'?'active':''}" href="#" onclick="nav('home');return false;">Trang chủ</a>
      <a class="nav-link ${state.route.page==='sell'?'active':''}" href="#" onclick="goSell();return false;">Đăng bán</a>
      <a class="nav-link ${state.route.page==='mylistings'?'active':''}" href="#" onclick="goMyListings();return false;">Tin đăng của tôi</a>
      <a class="nav-link ${state.route.page==='orders'?'active':''}" href="#" onclick="goOrders();return false;">Đơn hàng</a>
      <a class="nav-link ${state.route.page==='leaderboard'?'active':''}" href="#" onclick="nav('leaderboard');return false;">Xếp hạng</a>
      <a class="nav-link ${state.route.page==='history'?'active':''}" href="#" onclick="nav('history');return false;">Đã hoàn tất</a>
      ${state.currentUser && state.currentUser.role==='admin' ? `<a class="nav-link ${state.route.page==='admin'?'active':''}" href="#" onclick="nav('admin');return false;">Quản trị</a>` : ''}
    </nav>
    <div class="topbar-right">
      <a href="#" class="nav-link" onclick="nav('cart');return false;">Giỏ hàng${cartCount?`<span class="count-pill">${cartCount}</span>`:''}</a>
      ${state.currentUser?`
      <div class="notif-wrap">
        <a href="#" class="nav-link" onclick="toggleNotif();return false;">Thông báo${unread?`<span class="count-pill">${unread}</span>`:''}</a>
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

async function renderPage(){
  const app = document.getElementById('app');
  app.innerHTML = skeletonFor(state.route.page);
  let html = '';
  try{
    switch(state.route.page){
      case 'home': html = await pageHome(); break;
      case 'product': html = await pageProduct(state.route.params.id); break;
      case 'sell': html = await pageSell(); break;
      case 'mylistings': html = await pageMyListings(); break;
      case 'cart': html = await pageCart(); break;
      case 'orders': html = await pageOrders(); break;
      case 'admin': html = await pageAdmin(); break;
      case 'seller': html = await pageSeller(state.route.params.id); break;
      case 'profile': html = await pageProfile(); break;
      case 'leaderboard': html = await pageLeaderboard(); break;
      case 'history': html = await pageHistory(); break;
      case 'faq': html = await pageFaq(); break;
      case 'privacy': html = await pagePrivacy(); break;
      default: html = pageNotFound();
    }
  }catch(err){
    console.error(err);
    html = `<div class="wrap section page-fade"><div class="empty">Có lỗi khi tải dữ liệu: ${esc(err.message)}<br><span class="field hint">Kiểm tra lại cấu hình trong js/firebase-config.js, và đảm bảo đã bật Firestore + áp dụng đúng Security Rules.</span></div></div>`;
  }
  app.innerHTML = html;
  if(state.route.page==='sell') renderThumbs();
  if(state.route.page==='home') runHeroCountUp();
  updateStickyCta();
}

// Thanh CTA dính đáy màn hình trên di động — ẩn khi đang ở trang Đăng bán
// (vì lúc đó nút "Đăng bán ngay" không còn ý nghĩa).
function updateStickyCta(){
  const el = document.getElementById('sticky-mobile-cta');
  if(!el) return;
  el.classList.toggle('show', state.route.page !== 'sell');
}

export {
  nav, render, requireLogin, goSell, goMyListings, goOrders, toggleNotif,
  notifClick, parseRouteFromLocation
};
