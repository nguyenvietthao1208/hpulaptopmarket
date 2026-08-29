// ============================================================
// Hàm tiện ích dùng chung: định dạng, escape HTML, toast, nén ảnh, hiệu ứng nhỏ...
// Không phụ thuộc Firebase hay state — có thể dùng ở bất kỳ file nào.
// ============================================================

function esc(s){ const d=document.createElement('div'); d.textContent = (s===null||s===undefined)?'':String(s); return d.innerHTML; }

function fmtVND(n){ return Number(n||0).toLocaleString('vi-VN')+' đ'; }

function toMillis(ts){ if(!ts) return 0; if(ts.toDate) return ts.toDate().getTime(); if(ts.seconds) return ts.seconds*1000; return new Date(ts).getTime(); }

function fmtDate(ts){ if(!ts) return '—'; const d = ts.toDate? ts.toDate() : new Date(toMillis(ts)); return d.toLocaleDateString('vi-VN')+' '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}); }

function initials(name){ return (name||'?').trim().split(/\s+/).slice(-2).map(w=>w[0]).join('').toUpperCase(); }

function avatarHtml(user, style){
  style = style || '';
  if(user && user.avatarUrl){
    return `<div class="seller-avatar" style="${style}padding:0;overflow:hidden;"><img src="${esc(user.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="Ảnh đại diện của ${esc(user.name||'người dùng')}"></div>`;
  }
  return `<div class="seller-avatar" style="${style}">${esc(initials(user?user.name:'?'))}</div>`;
}

function sortDesc(arr){ return arr.slice().sort((a,b)=> toMillis(b.createdAt)-toMillis(a.createdAt)); }

function sortAsc(arr){ return arr.slice().sort((a,b)=> toMillis(a.createdAt)-toMillis(b.createdAt)); }

function toast(msg, kind){
  const el = document.createElement('div');
  el.className = 'toast'+(kind?(' '+kind):'');
  el.textContent = msg;
  document.getElementById('toast-region').appendChild(el);
  setTimeout(()=>el.remove(), 4200);
}

function mapAuthError(err){
  const code = err && err.code;
  const table = {
    'auth/email-already-in-use': 'Email này đã được đăng ký.',
    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
    'auth/network-request-failed': 'Lỗi kết nối mạng, vui lòng thử lại.'
  };
  return table[code] || (err && err.message) || 'Có lỗi xảy ra, vui lòng thử lại.';
}

function buildUsersById(users){ const m={}; users.forEach(u=>m[u.id]=u); return m; }

function statsFromUser(u){
  const reviewCount = (u && u.ratingCount) || 0;
  const avg = reviewCount ? (u.ratingSum||0)/reviewCount : 0;
  const completed = (u && u.dealsCompleted) || 0;
  return { completed, reviewCount, avg };
}

function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file, maxDim=1000, quality=0.72){
  const dataUrl = await fileToDataURL(file);
  const img = new Image();
  await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=dataUrl; });
  let { width, height } = img;
  if(width > height && width > maxDim){ height = Math.round(height*maxDim/width); width = maxDim; }
  else if(height >= width && height > maxDim){ width = Math.round(width*maxDim/height); height = maxDim; }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function scrollToTop(){ window.scrollTo({top:0, behavior:'smooth'}); }

window.addEventListener('scroll', ()=>{
  const btn = document.getElementById('back-to-top');
  if(!btn) return;
  btn.classList.toggle('show', window.scrollY > 360);
});

async function copyText(text, btnEl){
  try{
    await navigator.clipboard.writeText(text);
    if(btnEl){
      const original = btnEl.textContent;
      btnEl.textContent = 'Đã chép';
      btnEl.classList.add('copied');
      setTimeout(()=>{ btnEl.textContent = original; btnEl.classList.remove('copied'); }, 1800);
    }
    toast('Đã sao chép: '+text, 'success');
  }catch(e){ toast('Không thể sao chép, vui lòng thử lại.','error'); }
}

function animateCount(el, target){
  if(!el) return;
  const dur = 700;
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now-start)/dur);
    const eased = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(target*eased).toLocaleString('vi-VN');
    if(p<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function runHeroCountUp(){
  document.querySelectorAll('.hero-stat b[data-count]').forEach(el=>{
    animateCount(el, Number(el.dataset.count||0));
  });
}

/* ============ V3: tiêu đề trang riêng + breadcrumb dùng chung ============ */
function setPageTitle(title){
  document.title = title ? `${title} — HPU LaptopMarket` : 'HPU LaptopMarket — Chợ laptop cũ dành cho sinh viên HPU';
}

// items: [{label, page, id}] — mục cuối cùng không có "page" sẽ hiện như trang hiện tại (không phải link).
// "id" (nếu có) chỉ dùng cho các trang cần 1 tham số đơn giản như {id:'...'} (vd: trang người bán).
function renderBreadcrumbs(items){
  const parts = items.map((it, i) => {
    const isLast = i === items.length - 1;
    if(isLast || !it.page){
      return `<span class="current">${esc(it.label)}</span>`;
    }
    const paramsArg = it.id ? `,{id:'${it.id}'}` : '';
    return `<a href="#" onclick="nav('${it.page}'${paramsArg});return false;">${esc(it.label)}</a>`;
  });
  return `<nav class="breadcrumbs" aria-label="breadcrumb">${parts.join('<span class="sep">›</span>')}</nav>`;
}

export {
  esc, fmtVND, toMillis, fmtDate, initials, avatarHtml, sortDesc, sortAsc,
  toast, mapAuthError, buildUsersById, statsFromUser, fileToDataURL, compressImage,
  scrollToTop, copyText, animateCount, runHeroCountUp, setPageTitle, renderBreadcrumbs
};
