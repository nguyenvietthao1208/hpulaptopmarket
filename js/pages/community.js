// ============================================================
// Trang Quy định cộng đồng — nguyên tắc để giao dịch trên HPU LM
// an toàn, minh bạch và tôn trọng lẫn nhau.
// ============================================================
import { setPageTitle, renderBreadcrumbs } from '../helpers.js';

function pageCommunity(){
  setPageTitle('Quy định cộng đồng');
  return `<div class="wrap section page-fade" style="max-width:760px;">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Quy định cộng đồng'}])}
    <span class="eyebrow">Cộng đồng HPU LM</span>
    <h1 style="font-size:22px;margin-bottom:6px;">Quy định cộng đồng</h1>
    <p class="field hint" style="margin-bottom:0;">Cập nhật lần cuối: 2026</p>

    <div class="community-notice">
      <strong>Mục tiêu chung</strong>
      <p>HPU LM là nơi sinh viên trao đổi laptop cũ một cách rõ ràng và đáng tin cậy. Mỗi thành viên đều góp phần giữ cho cộng đồng an toàn.</p>
    </div>

    <div class="policy-content">
      <h3>1. Đăng tin trung thực</h3>
      <ul>
        <li>Mô tả đúng tình trạng, cấu hình, nguồn gốc và phụ kiện đi kèm của sản phẩm.</li>
        <li>Sử dụng hình ảnh thật của sản phẩm; không dùng ảnh gây hiểu nhầm hoặc ảnh của người khác.</li>
        <li>Cập nhật hoặc gỡ tin ngay khi sản phẩm đã bán, không còn sẵn sàng giao dịch.</li>
      </ul>

      <h3>2. Giao dịch an toàn</h3>
      <ul>
        <li>Chỉ trao đổi và đặt mua những sản phẩm hợp pháp, không thuộc danh mục bị cấm.</li>
        <li>Kiểm tra máy, phụ kiện và thông tin giao dịch trước khi hoàn tất mua bán.</li>
        <li>Không chia sẻ mật khẩu, mã xác thực hoặc thông tin tài khoản cho bất kỳ ai.</li>
        <li>Chủ động báo cáo tin đăng hoặc tài khoản có dấu hiệu lừa đảo cho quản trị viên.</li>
      </ul>

      <h3>3. Tôn trọng thành viên</h3>
      <ul>
        <li>Giao tiếp lịch sự, không xúc phạm, đe dọa, quấy rối hoặc phân biệt đối xử.</li>
        <li>Không spam, đăng nội dung quảng cáo không liên quan hoặc cố tình làm gián đoạn giao dịch.</li>
        <li>Đánh giá dựa trên trải nghiệm giao dịch thực tế, công bằng và có trách nhiệm.</li>
      </ul>

      <h3>4. Nội dung không được phép</h3>
      <ul>
        <li>Hàng giả, hàng trộm cắp, phần mềm hoặc tài khoản vi phạm bản quyền.</li>
        <li>Nội dung trái pháp luật, lừa đảo, gây hại hoặc xâm phạm quyền riêng tư của người khác.</li>
        <li>Thông tin sai lệch có chủ ý, spam hàng loạt hoặc hành vi thao túng đánh giá.</li>
      </ul>

      <h3>5. Xử lý vi phạm</h3>
      <p>Quản trị viên có thể ẩn hoặc gỡ tin, hạn chế tính năng, tạm khóa hoặc khóa tài khoản tùy theo mức độ vi phạm. Các giao dịch có dấu hiệu rủi ro có thể được giữ lại để kiểm tra.</p>

      <h3>6. Báo cáo và hỗ trợ</h3>
      <p>Khi phát hiện vấn đề, hãy lưu lại thông tin liên quan và liên hệ quản trị viên qua nút hỗ trợ trên website. Việc báo cáo đúng sự thật giúp bảo vệ cả người mua và người bán.</p>
    </div>
  </div>`;
}

export { pageCommunity };
