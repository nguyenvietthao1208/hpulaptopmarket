// ============================================================
// Trang 404 tùy chỉnh — hiện khi vào URL không tồn tại (vd: sản phẩm đã bị
// xóa, gõ sai đường dẫn, hoặc dán link cũ đã hết hạn).
// ============================================================
import { setPageTitle } from '../helpers.js';

function pageNotFound(){
  setPageTitle('Không tìm thấy trang (404)');
  return `<div class="wrap section page-fade">
    <div class="notfound-wrap">
      <div class="notfound-code">404</div>
      <div class="notfound-title">Không tìm thấy trang này</div>
      <p class="notfound-desc">Đường dẫn bạn vào có thể đã bị gỡ, đổi chỗ, hoặc chưa từng tồn tại trên HPU LaptopMarket.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="nav('home')">Về trang chủ</button>
        <button class="btn btn-ghost" onclick="nav('faq')">Xem câu hỏi thường gặp</button>
      </div>
    </div>
  </div>`;
}

export { pageNotFound };
