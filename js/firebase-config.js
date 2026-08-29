// ============================================================
// ĐIỀN CONFIG FIREBASE CỦA BẠN VÀO ĐÂY
// Lấy tại: Firebase Console → Project settings → phần "Your apps" → Web app
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBsZNF2-mIsWZxSjBpD1PoUBUz-ejTqEFk",
  authDomain: "hpu-lm.firebaseapp.com",
  projectId: "hpu-lm",
  storageBucket: "hpu-lm.firebasestorage.app",
  messagingSenderId: "496322828091",
  appId: "1:496322828091:web:369c883cf9829328af091e"
};

// Tên miền của ứng dụng (dùng cho email reset link)
// Thay bằng domain thực của bạn (vd: https://hpulaptopmarket.vercel.app)
export const appDomain = "https://hpulaptopmarket.vercel.app";

// ============================================================
// (TÙY CHỌN) CẤU HÌNH EMAILJS ĐỂ GỬI EMAIL THẬT TỚI NGƯỜI BÁN
// Đăng ký miễn phí tại https://www.emailjs.com (gói free: 200 email/tháng)
// Xem hướng dẫn chi tiết trong README.md — mục "Thiết lập gửi email"
// Để trống 3 giá trị bên dưới nếu bạn CHƯA thiết lập EmailJS:
// app sẽ tự động bỏ qua bước gửi email và chỉ dùng thông báo trong app.
// ============================================================
export const emailjsConfig = {
  // Tài khoản EmailJS chính đang dùng cho email đơn hàng / tin đăng mới
  publicKey: "np5IdQu0EkKaNTjW0",     // vd: "np5IdQu0EkKaNTjW0"
  serviceId: "service_gfcry9e",      // vd: "service_gfcry9e"
  templateId: "template_z7xhm93",     // vd: "template_z7xhm93"
  adminTemplateId: "template_i0llib6",       // template gửi cho ADMIN khi có tin đăng mới cần duyệt (tùy chọn)

  // Tài khoản EmailJS riêng cho RESET MẬT KHẨU
  // Nếu bạn tạo tài khoản mới (EmailJS mới) cho mục đích quên mật khẩu,
  // hãy điền các giá trị dưới đây. Nếu để trống, hệ thống sẽ dùng tài khoản cũ.
  resetPublicKey: "7ojktqvKeDzb7zwv-",
  resetServiceId: "service_sq19gx4",
  resetTemplateId: "template_zkms4a4" // template gửi mã xác thực 4 chữ số cho quên mật khẩu
};

