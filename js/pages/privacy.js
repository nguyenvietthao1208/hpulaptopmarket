// ============================================================
// Trang Chính sách bảo mật (Privacy Policy) — cần thiết vì web thu thập
// SĐT, địa chỉ thật của sinh viên trong quá trình mua bán.
// ============================================================
import { setPageTitle, renderBreadcrumbs } from '../helpers.js';

function pagePrivacy(){
  setPageTitle('Chính sách bảo mật');
  return `<div class="wrap section page-fade" style="max-width:760px;">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Chính sách bảo mật'}])}
    <span class="eyebrow">Pháp lý</span>
    <h1 style="font-size:22px;margin-bottom:6px;">Chính sách bảo mật</h1>
    <p class="field hint" style="margin-bottom:0;">Cập nhật lần cuối: 2026</p>

    <div class="policy-content">
      <h3>1. Thông tin chúng tôi thu thập</h3>
      <ul>
        <li>Họ tên, email, số điện thoại khi bạn đăng ký tài khoản.</li>
        <li>Số điện thoại và khu vực khi bạn đăng bán một sản phẩm.</li>
        <li>Họ tên, số điện thoại, địa chỉ nhận hàng khi bạn đặt mua một sản phẩm.</li>
        <li>Ảnh sản phẩm và ảnh đại diện bạn tải lên (đã được nén trước khi lưu trữ).</li>
      </ul>

      <h3>2. Chúng tôi dùng thông tin này để làm gì</h3>
      <ul>
        <li>Kết nối người mua và người bán để hoàn tất giao dịch.</li>
        <li>Gửi thông báo trong ứng dụng và email liên quan đến đơn hàng, tin đăng của bạn.</li>
        <li>Hiển thị điểm uy tín (số đơn đã hoàn tất, đánh giá trung bình) trên hồ sơ công khai.</li>
      </ul>

      <h3>3. Ai xem được thông tin của bạn</h3>
      <ul>
        <li><b>Số điện thoại người bán</b>: chỉ hiển thị cho người dùng đã đăng nhập.</li>
        <li><b>Địa chỉ nhận hàng, SĐT người mua</b>: chỉ người bán của đúng đơn hàng đó xem được, không công khai.</li>
        <li><b>Tên, ảnh đại diện, điểm đánh giá</b>: hiển thị công khai trên hồ sơ người bán và bảng xếp hạng.</li>
        <li>Chúng tôi <b>không bán hoặc chia sẻ</b> thông tin của bạn cho bên thứ ba ngoài mục đích vận hành website.</li>
      </ul>

      <h3>4. Nơi lưu trữ dữ liệu</h3>
      <p>Toàn bộ dữ liệu được lưu trữ trên Google Firebase (Firestore), có quy tắc bảo mật (Security Rules) giới hạn quyền đọc/ghi theo đúng vai trò của từng người dùng.</p>

      <h3>5. Quyền của bạn</h3>
      <p>Bạn có thể tự sửa hoặc xóa thông tin hồ sơ cá nhân (tên, SĐT, ảnh đại diện) bất kỳ lúc nào trong mục "Hồ sơ cá nhân". Nếu muốn xóa toàn bộ tài khoản hoặc dữ liệu liên quan, vui lòng liên hệ quản trị viên của trang.</p>

      <h3>6. Cookie & theo dõi truy cập</h3>
      <p>Website sử dụng Google Analytics để thống kê số lượt truy cập và hành vi sử dụng chung (ẩn danh), giúp cải thiện trải nghiệm. Chúng tôi không dùng cookie cho mục đích quảng cáo.</p>
    </div>
  </div>`;
}

export { pagePrivacy };
