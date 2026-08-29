// ============================================================
// Trang 404 tùy chỉnh — hiện khi vào URL không tồn tại (vd: sản phẩm đã bị
// xóa, gõ sai đường dẫn, hoặc dán link cũ đã hết hạn).
// ============================================================
import { setPageTitle } from '../helpers.js';

function pageNotFound(){
  setPageTitle('Không tìm thấy trang (404)');
  return `<div class="wrap section page-fade">
    <div class="notfound-wrap">
      <div class="notfound-visual" aria-hidden="true">
        <div class="notfound-orb"></div>
        <div class="notfound-device">
          <div class="notfound-screen">
            <span>404</span>
          </div>
          <div class="notfound-base"></div>
        </div>
      </div>
      <div class="notfound-code">404</div>
      <div class="notfound-title">Không tìm thấy trang này</div>
      <p class="notfound-desc">Đường dẫn bạn truy cập có thể đã bị đổi, bị gỡ hoặc chưa từng tồn tại trên HPU LaptopMarket.</p>
      <div class="notfound-actions">
        <button class="btn btn-primary" onclick="nav('home')">Về trang chủ</button>
        <button class="btn btn-ghost" onclick="nav('faq')">Xem FAQ</button>
      </div>
    </div>
  </div>`;
}

export { pageNotFound };
