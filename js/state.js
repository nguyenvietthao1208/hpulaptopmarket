// ============================================================
// State dùng chung toàn app (chỉ những gì THỰC SỰ cần dùng ở nhiều trang) +
// các bảng tra cứu hằng số. State riêng của từng trang (bộ lọc, modal, form...)
// nằm ngay trong file của trang đó, không đưa vào đây.
// ============================================================
export const state = {
  currentUser: null,   // { uid, name, email, phone, role, cart, ... } hoặc null
  route: { page: 'home', params: {} },
};

const STATUS_LABEL = { pending:'Chờ duyệt', approved:'Còn hàng', rejected:'Bị từ chối', reserved:'Đang được đặt', sold:'Đã bán' };

const STATUS_CLASS = { pending:'tag-pending', approved:'tag-approved', rejected:'tag-rejected', reserved:'tag-reserved', sold:'tag-sold' };

const ORDER_LABEL = { pending:'Chờ người bán xác nhận', confirmed:'Người bán đã xác nhận', shipping:'Đang giao hàng', completed:'Hoàn tất', cancelled:'Đã hủy' };

const ORDER_STEPS = ['pending','confirmed','shipping','completed'];

export { STATUS_LABEL, STATUS_CLASS, ORDER_LABEL, ORDER_STEPS };
