// ============================================================
// Trang đăng bán sản phẩm: form nhập liệu + chọn/nén ảnh + gửi duyệt.
// "pendingImageFiles" là state riêng của trang này (ảnh đang chọn, chưa lưu).
// ============================================================
import { state } from '../state.js';
import { esc, fmtVND, toast, compressImage, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchWhere, notifyUser } from '../firestore-helpers.js';
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-init.js';
import { sendAdminNewListingEmail } from '../email.js';
import { nav } from '../router.js';

let pendingImageFiles = [];

async function pageSell(){
  pendingImageFiles = [];
  setPageTitle('Đăng bán sản phẩm');
  if(!state.currentUser) return `<div class="wrap section page-fade"><div class="empty">Vui lòng đăng nhập để đăng bán.</div></div>`;
  return `
  <div class="wrap section page-fade" style="max-width:720px;">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Đăng bán'}])}
    <span class="eyebrow">Đăng bán</span>
    <h1 style="font-size:22px;">Đăng thông tin laptop cần bán</h1>
    <p class="field hint" style="margin:6px 0 18px;">Tin đăng sẽ được quản trị viên kiểm duyệt trước khi hiển thị công khai. Thông tin liên hệ là bắt buộc để người mua có thể liên lạc.</p>
    <form onsubmit="return submitListing(event)" class="panel">
      <div class="field"><label>Tên máy *</label><input class="input" name="title" required placeholder="vd: Dell Latitude 7420"></div>
      <div class="row2">
        <div class="field"><label>Hãng *</label><input class="input" name="brand" required placeholder="vd: Dell"></div>
        <div class="field"><label>Giá bán (đ) *</label><input class="input" type="number" name="price" required min="100000"></div>
      </div>
      <div class="row2">
        <div class="field"><label>CPU *</label><input class="input" name="cpu" required placeholder="vd: Core i5-1135G7"></div>
        <div class="field"><label>RAM *</label><input class="input" name="ram" required placeholder="vd: 16GB"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Ổ lưu trữ *</label><input class="input" name="storage" required placeholder="vd: 512GB SSD"></div>
        <div class="field"><label>Màn hình *</label><input class="input" name="screen" required placeholder="vd: 14 inch FHD"></div>
      </div>
      <div class="field"><label>Tình trạng máy *</label>
        <select class="select" name="condition" required>
          <option value="">— Chọn tình trạng —</option>
          <option>95-99% (như mới)</option>
          <option>85-94% (đẹp)</option>
          <option>70-84% (dùng tốt)</option>
          <option>Đã sửa chữa/thay linh kiện</option>
        </select>
      </div>
      <div class="field"><label>Mô tả chi tiết *</label><textarea class="textarea" name="description" required placeholder="Tình trạng pin, phụ kiện kèm theo, lý do bán..."></textarea></div>
      <div class="field">
        <label>Ảnh sản phẩm * (tối đa 3 ảnh, mỗi ảnh dưới 5MB (ảnh sẽ được tự động nén nhỏ lại))</label>
        <label class="upload-box" for="imgInput">
          <input type="file" id="imgInput" accept="image/*" multiple onchange="onImagesSelected(this)">
          <div>Nhấn để chọn ảnh, hoặc chọn nhiều ảnh cùng lúc</div>
          <div class="upload-hint">Ảnh thật của máy giúp tin đăng đáng tin hơn và dễ được duyệt hơn.</div>
        </label>
        <div class="thumb-row" id="thumb-row"></div>
      </div>
      <div class="divider"></div>
      <p class="field hint" style="text-transform:none;font-weight:600;color:var(--ink);margin-bottom:10px;">Thông tin liên hệ (bắt buộc)</p>
      <div class="row2">
        <div class="field"><label>Số điện thoại *</label><input class="input" name="phone" required pattern="[0-9]{9,11}" value="${esc(state.currentUser.phone||'')}"></div>
        <div class="field"><label>Khu vực *</label><input class="input" name="zone" required placeholder="vd: Hà Nội"></div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Gửi tin đăng để duyệt</button>
    </form>
  </div>`;
}

function renderThumbs(){
  const row = document.getElementById('thumb-row');
  if(!row) return;
  row.innerHTML = pendingImageFiles.map((f,i)=>`<div class="thumb"><img src="${URL.createObjectURL(f)}" alt="Ảnh sản phẩm ${i+1}"><button type="button" class="rm" onclick="removeImage(${i})">×</button></div>`).join('');
}

function onImagesSelected(input){
  const files = Array.from(input.files || []);
  const tooBig = files.find(f=>f.size > 5*1024*1024);
  if(tooBig){ toast(`Ảnh "${tooBig.name}" vượt quá 5MB, vui lòng chọn ảnh khác.`,'error'); }
  const okFiles = files.filter(f=>f.size <= 5*1024*1024);
  pendingImageFiles = pendingImageFiles.concat(okFiles).slice(0,3);
  renderThumbs();
  input.value = '';
}

function removeImage(i){ pendingImageFiles.splice(i,1); renderThumbs(); }

async function submitListing(e){
  e.preventDefault();
  if(pendingImageFiles.length < 1){ toast('Vui lòng chọn ít nhất 1 ảnh sản phẩm.','error'); return false; }
  const submitBtn = e.target.querySelector('button[type=submit]');
  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true; submitBtn.textContent = 'Đang xử lý ảnh...';
  try{
    const f = new FormData(e.target);
    const images = [];
    for(const file of pendingImageFiles){
      images.push(await compressImage(file));
    }
    const approxKB = Math.round(images.join('').length * 0.75 / 1024);
    if(approxKB > 700){
      toast(`Ảnh sau khi nén vẫn còn nặng (~${approxKB}KB). Vui lòng chọn ít ảnh hơn hoặc ảnh đơn giản hơn.`,'error');
      submitBtn.disabled = false; submitBtn.textContent = originalLabel;
      return false;
    }
    submitBtn.textContent = 'Đang đăng tin...';
    const data = {
      sellerId: state.currentUser.uid, sellerName: state.currentUser.name,
      title:f.get('title').trim(), brand:f.get('brand').trim(), price:Number(f.get('price')),
      cpu:f.get('cpu').trim(), ram:f.get('ram').trim(), storage:f.get('storage').trim(), screen:f.get('screen').trim(),
      condition:f.get('condition'), description:f.get('description').trim(),
      contactPhone:f.get('phone').trim(), contactZone:f.get('zone').trim(),
      images, status:'pending', createdAt: serverTimestamp()
    };
    const createdDoc = await addDoc(collection(db,'products'), data);
    const productUrl = `${window.location.origin}${window.location.pathname}#/product?id=${createdDoc.id}`;
    const admins = await fetchWhere('users','role','==','admin');
    await Promise.all(admins.map(a=> notifyUser(a.id,'Có tin đăng mới cần duyệt', `"${data.title}" vừa được đăng bởi ${state.currentUser.name}, đang chờ bạn kiểm duyệt.`, {page:'admin', params:{tab:'pending'}})));
    await Promise.all(admins.filter(a=>a.email).map(a=> sendAdminNewListingEmail({
      to_email: a.email, to_name: a.name,
      product_title: data.title, seller_name: state.currentUser.name,
      seller_phone: data.contactPhone, listing_price: fmtVND(data.price),
      listing_link: productUrl
    })));
    pendingImageFiles = [];
    toast('Đã gửi tin đăng, chờ quản trị viên duyệt.','success');
    await nav('mylistings');
  }catch(err){
    toast('Có lỗi khi đăng tin: '+err.message,'error');
    submitBtn.disabled = false; submitBtn.textContent = originalLabel;
  }
  return false;
}

export { pageSell, renderThumbs, onImagesSelected, removeImage, submitListing };
