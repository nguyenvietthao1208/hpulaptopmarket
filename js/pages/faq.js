// ============================================================
// Trang Câu hỏi thường gặp (FAQ) — dạng accordion, bấm để mở/đóng.
// ============================================================
import { esc, setPageTitle, renderBreadcrumbs } from '../helpers.js';

const FAQ_ITEMS = [
  {
    q: 'Vì sao tin đăng của tôi phải chờ duyệt mới hiển thị công khai?',
    a: 'Để tránh tin rác, hàng giả, hoặc thông tin sai lệch, mọi tin đăng đều được quản trị viên kiểm tra trước khi hiển thị cho người mua. Thông thường việc duyệt diễn ra trong vòng 24 giờ. Bạn sẽ nhận được thông báo ngay khi tin được duyệt hoặc bị từ chối (kèm lý do cụ thể).'
  },
  {
    q: 'Thông tin cá nhân (SĐT, địa chỉ) của tôi có được bảo mật không?',
    a: 'Số điện thoại người bán chỉ hiển thị cho người dùng đã đăng nhập. Địa chỉ nhận hàng bạn nhập khi đặt mua chỉ người bán của đúng đơn hàng đó xem được, không công khai cho người khác. Xem chi tiết tại trang Chính sách bảo mật.'
  },
  {
    q: 'Làm sao để đăng bán một chiếc laptop?',
    a: 'Đăng nhập → bấm "Đăng bán" trên thanh điều hướng → điền đầy đủ cấu hình máy, giá bán, ít nhất 1 ảnh thật của máy, và số điện thoại liên hệ → gửi đi. Tin sẽ ở trạng thái "Chờ duyệt" cho đến khi quản trị viên xác nhận.'
  },
  {
    q: 'Điểm uy tín và đánh giá của người bán được tính thế nào?',
    a: 'Sau khi một đơn hàng được người mua xác nhận đã nhận hàng, người mua có thể để lại đánh giá 1-5 sao kèm nhận xét cho người bán. Điểm hiển thị trên trang xếp hạng và hồ sơ người bán là điểm trung bình của tất cả đánh giá đã nhận, không thể chỉnh sửa hay xóa bởi người bán.'
  },
  {
    q: 'Tôi muốn liên hệ với người bán trước khi mua thì làm thế nào?',
    a: 'Vào trang chi tiết sản phẩm, bạn có thể để lại bình luận hoặc đề nghị giá ngay dưới sản phẩm, hoặc bấm "Sao chép SĐT" trong khung thông tin người bán để liên hệ trực tiếp qua điện thoại.'
  },
];

function pageFaq(){
  setPageTitle('Câu hỏi thường gặp');
  return `<div class="wrap section page-fade" style="max-width:720px;">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Câu hỏi thường gặp'}])}
    <span class="eyebrow">Hỗ trợ</span>
    <h1 style="font-size:22px;margin-bottom:18px;">Câu hỏi thường gặp</h1>
    ${FAQ_ITEMS.map((item, i) => `
      <div class="faq-item" id="faq-item-${i}">
        <button type="button" class="faq-q" onclick="toggleFaq(${i})">
          <span>${esc(item.q)}</span>
          <span class="plus">+</span>
        </button>
        <div class="faq-a">${esc(item.a)}</div>
      </div>`).join('')}
    <p class="field hint" style="margin-top:18px;">Chưa tìm thấy câu trả lời bạn cần? Xem thêm <a class="linklike" href="#" onclick="nav('privacy');return false;">Chính sách bảo mật</a>.</p>
  </div>`;
}

function toggleFaq(i){
  const el = document.getElementById(`faq-item-${i}`);
  if(el) el.classList.toggle('open');
}

export { pageFaq, toggleFaq };
