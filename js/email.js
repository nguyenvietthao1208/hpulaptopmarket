// ============================================================
// Gửi email thật khi có đơn hàng mới / tin đăng mới cần duyệt, dùng EmailJS
// (chạy hoàn toàn phía trình duyệt, không cần Cloud Functions / gói Blaze)
// ============================================================
import { emailjsConfig } from './firebase-config.js';

let ready = false;
let adminReady = false;
let resetReady = false;

export function initEmail(){
  if(!emailjsConfig.publicKey || !emailjsConfig.serviceId){
    console.warn('[EmailJS] Chưa cấu hình emailjsConfig trong firebase-config.js — sẽ bỏ qua gửi email thật, chỉ dùng thông báo trong app.');
    return;
  }
  if(typeof emailjs === 'undefined'){
    console.warn('[EmailJS] Không tìm thấy thư viện emailjs — kiểm tra lại thẻ <script> trong index.html.');
    return;
  }
  emailjs.init({ publicKey: emailjsConfig.publicKey });
  ready = !!emailjsConfig.templateId;
  adminReady = !!emailjsConfig.adminTemplateId;
  resetReady = !!emailjsConfig.resetTemplateId;
}

// templateParams nên khớp với các biến {{...}} bạn đặt trong template EmailJS.
// Gợi ý tên biến dùng trong README: to_email, to_name, product_title, price,
// buyer_name, buyer_phone, buyer_address, order_id
export async function sendOrderEmail(templateParams){
  if(!ready) return { skipped: true };
  try{
    await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, templateParams);
    return { sent: true };
  }catch(err){
    console.error('[EmailJS] Gửi email thất bại:', err);
    return { sent: false, error: err };
  }
}

// Gửi email cho admin khi có tin đăng mới cần duyệt — dùng template RIÊNG
// (emailjsConfig.adminTemplateId), vì nội dung/biến khác với email đơn hàng.
// Gợi ý biến dùng trong README: to_email, to_name, product_title, seller_name,
// seller_phone, listing_price
export async function sendAdminNewListingEmail(templateParams){
  if(!adminReady) return { skipped: true };
  try{
    await emailjs.send(emailjsConfig.serviceId, emailjsConfig.adminTemplateId, templateParams);
    return { sent: true };
  }catch(err){
    console.error('[EmailJS] Gửi email cho admin thất bại:', err);
    return { sent: false, error: err };
  }
}

export async function sendPasswordResetCodeEmail(templateParams){
  const useResetPublicKey = emailjsConfig.resetPublicKey || emailjsConfig.publicKey;
  const useResetServiceId = emailjsConfig.resetServiceId || emailjsConfig.serviceId;
  const useResetTemplateId = emailjsConfig.resetTemplateId || emailjsConfig.templateId;

  if(!emailjsConfig.resetTemplateId && !emailjsConfig.templateId) return { skipped: true };

  try{
    emailjs.init({ publicKey: useResetPublicKey });
    await emailjs.send(useResetServiceId, useResetTemplateId, templateParams);
    return { sent: true };
  }catch(err){
    console.error('[EmailJS] Gửi email mã xác thực thất bại:', err);
    return { sent: false, error: err };
  }
}

// Gửi mã xác nhận xóa tài khoản qua EmailJS
export async function sendDeleteAccountCodeEmail(templateParams){
  const useResetPublicKey = emailjsConfig.resetPublicKey || emailjsConfig.publicKey;
  const useResetServiceId = emailjsConfig.resetServiceId || emailjsConfig.serviceId;
  const useResetTemplateId = emailjsConfig.resetTemplateId || emailjsConfig.templateId;

  if(!emailjsConfig.resetTemplateId && !emailjsConfig.templateId) return { skipped: true };

  try{
    emailjs.init({ publicKey: useResetPublicKey });
    await emailjs.send(useResetServiceId, useResetTemplateId, templateParams);
    return { sent: true };
  }catch(err){
    console.error('[EmailJS] Gửi email xác nhận xóa tài khoản thất bại:', err);
    return { sent: false, error: err };
  }
}
