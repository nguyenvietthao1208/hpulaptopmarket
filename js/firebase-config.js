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

// ============================================================
// (TÙY CHỌN) CẤU HÌNH EMAILJS ĐỂ GỬI EMAIL THẬT TỚI NGƯỜI BÁN
// Đăng ký miễn phí tại https://www.emailjs.com (gói free: 200 email/tháng)
// Xem hướng dẫn chi tiết trong README.md — mục "Thiết lập gửi email"
// Để trống 3 giá trị bên dưới nếu bạn CHƯA thiết lập EmailJS:
// app sẽ tự động bỏ qua bước gửi email và chỉ dùng thông báo trong app.
// ============================================================
export const emailjsConfig = {
  publicKey: "np5IdQu0EkKaNTjW0",     // vd: "np5IdQu0EkKaNTjW0"
  serviceId: "service_gfcry9e",      // vd: "service_gfcry9e"
  templateId: "template_z7xhm93",     // vd: "template_z7xhm93"
  adminTemplateId: "template_i0llib6"       // template gửi cho ADMIN khi có tin đăng mới cần duyệt (tùy chọn)
};

