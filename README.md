# HPU LaptopMarket (HPU_LM) — bản kết nối Firebase thật

Đây là bản nâng cấp từ bản demo: dùng **Firebase Authentication** (Email/Password + Google),
**Cloud Firestore** (toàn bộ dữ liệu, kể cả ảnh sản phẩm đã nén — không dùng Firebase Storage),
và **EmailJS** (gửi email thông báo cho người bán — miễn phí, không cần nâng cấp gói Blaze).

> ⚠️ **Nếu bạn đã tải bản trước đó**: bản này bổ sung nhiều tính năng mới (hồ sơ cá nhân,
> xếp hạng người bán, kho giao dịch, thông báo bấm được, admin gỡ tin đã duyệt...) và
> **cần dán lại `firestore.rules` mới** vào Firebase Console → Firestore Database → Rules
> → Publish, nếu không các tính năng liên quan sẽ báo lỗi quyền truy cập. Xem mục "Có gì
> mới trong bản này" ở cuối file.

## Cấu trúc thư mục
```
index.html
css/styles.css
img/                        ← favicon + ảnh chia sẻ mạng xã hội (og-share.png)
js/
├── firebase-config.js       ← BẠN ĐIỀN CONFIG FIREBASE + EMAILJS VÀO ĐÂY
├── firebase-init.js         ← khởi tạo Firebase App/Auth/Firestore
├── email.js                 ← gửi email qua EmailJS
├── state.js                 ← state dùng chung toàn app (currentUser, route) + hằng số
├── helpers.js                ← hàm tiện ích chung (định dạng, toast, nén ảnh, breadcrumb...)
├── firestore-helpers.js       ← đọc/ghi Firestore dùng chung
├── router.js                  ← điều hướng URL riêng từng trang + khung trang (header...)
├── modals.js                   ← toàn bộ modal (đăng nhập, đặt mua, đánh giá, hủy đơn...)
├── actions-auth.js              ← đăng ký/đăng nhập/đăng xuất
├── main.js                       ← điểm khởi động, ráp nối mọi thứ lại với nhau
└── pages/                         ← mỗi trang 1 file riêng, dễ tìm & sửa
    ├── home.js, product.js, sell.js, mylistings.js, cart.js, orders.js,
    │   admin.js, seller.js, profile.js, leaderboard.js, history.js,
    │   faq.js, privacy.js, notfound.js
firestore.rules              ← Security Rules cho Firestore (BẮT BUỘC phải dán vào Console)
storage.rules.unused          ← không dùng ở bản này (xem mục "Về việc lưu ảnh sản phẩm")
```

> **Muốn sửa 1 tính năng cụ thể?** Vào thẳng file trang tương ứng trong `js/pages/`.
> Ví dụ: sửa trang chủ → `js/pages/home.js`; sửa luồng đặt hàng → `js/pages/orders.js`;
> sửa modal đăng nhập → `js/modals.js`. Không cần lục tìm trong 1 file khổng lồ nữa.

## Bước 1 — Tạo project Firebase
1. Vào https://console.firebase.google.com → **Add project** → đặt tên (vd: `hpu-lm`) → tạo xong.
2. Trong project, vào **Build → Authentication → Get started**.
   - Tab **Sign-in method** → bật **Email/Password**.
   - Bật thêm **Google** → chọn email hỗ trợ dự án → Save.
3. Vào **Build → Firestore Database → Create database** → chọn **Start in production mode** →
   chọn khu vực gần bạn (vd: `asia-southeast1`) → Enable.
4. Vào **Project settings** (biểu tượng bánh răng) → mục **Your apps** → bấm **</>** (Web) →
   đặt tên app → **Register app**. Firebase sẽ hiện đoạn `firebaseConfig` — copy toàn bộ đoạn đó.
5. Dán vào `js/firebase-config.js`, thay vào phần `firebaseConfig`.

> **Không cần bật Firebase Storage.** Bản này lưu ảnh sản phẩm trực tiếp trong Firestore
> (xem mục "Về việc lưu ảnh sản phẩm" ngay bên dưới) để tránh việc Google hiện nay bắt buộc
> bật gói Blaze (thẻ thanh toán) mới tạo được Storage bucket, kể cả khi bạn không dùng vượt
> hạn mức miễn phí.

## Về việc lưu ảnh sản phẩm (không dùng Firebase Storage)
Khi người bán chọn ảnh, trình duyệt sẽ tự động:
1. Resize ảnh xuống tối đa 1000px chiều dài nhất.
2. Nén chất lượng JPEG (~72%).
3. Lưu thẳng vào field `images` của document sản phẩm trên Firestore, dưới dạng chuỗi
   base64 — không cần Firebase Storage, không cần dịch vụ ngoài, không tốn phí.

Đánh đổi: mỗi tin đăng giới hạn **tối đa 3 ảnh**, vì Firestore giới hạn dung lượng mỗi
document ~1MB. Ứng dụng đã tự kiểm tra và báo lỗi nếu ảnh sau khi nén vẫn còn quá nặng.
Chất lượng ảnh sẽ không sắc nét bằng ảnh gốc, nhưng đủ dùng để xem trước khi liên hệ mua.

**Nếu sau này muốn ảnh chất lượng cao hơn / số lượng nhiều hơn**, có 2 hướng nâng cấp:
- Bật gói Blaze của Firebase (miễn phí nếu ở dưới hạn mức, chỉ cần thẻ để xác minh) rồi
  dùng lại `storage.rules.unused` (đổi tên thành `storage.rules`) — file này tôi đã viết sẵn.
- Hoặc dùng dịch vụ lưu ảnh miễn phí khác không cần thẻ, ví dụ **Cloudinary** (gói free
  25GB, upload thẳng từ trình duyệt bằng "unsigned upload preset"). Nếu bạn muốn, cứ nhắn
  tôi viết lại phần upload ảnh theo hướng này.

## Bước 2 — Áp dụng Security Rules
Trong Firebase Console:
- **Firestore Database → Rules** → dán nội dung file `firestore.rules` → **Publish**.

(Không cần làm Storage Rules nữa vì không dùng Firebase Storage — xem phần trên.)

## Bước 3 — Chạy thử trên máy
Vì `js/main.js` dùng `type="module"`, bạn **không thể** mở trực tiếp file `index.html` bằng
cách double-click (trình duyệt sẽ chặn do chính sách CORS với file `file://`). Cần chạy qua
một local server đơn giản, ví dụ:

```bash
# Cách 1: dùng Node (nếu đã cài Node.js)
npx serve .

# Cách 2: dùng Python
python3 -m http.server 8080
```
Sau đó mở `http://localhost:8080` (hoặc cổng mà lệnh trên báo).

## Bước 4 — Tạo tài khoản Admin đầu tiên
Vì lý do bảo mật, không ai có thể tự đăng ký thành admin qua form (xem `firestore.rules`).
Cách tạo admin đầu tiên:
1. Vào web, **Đăng ký** một tài khoản bình thường bằng email của bạn.
2. Vào **Firebase Console → Firestore Database → Data → collection `users`**.
3. Tìm document ứng với tài khoản vừa tạo (so email), sửa field `role` từ `"user"` thành `"admin"`.
4. Quay lại web, đăng xuất rồi đăng nhập lại — bạn sẽ thấy mục **Quản trị** trên thanh điều hướng.

## Bước 5 (tùy chọn) — Deploy lên Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # chọn project vừa tạo, thư mục public = thư mục chứa index.html này
firebase deploy
```
Sau khi deploy, Firebase cho bạn một domain dạng `https://ten-du-an.web.app`. Nếu dùng đăng nhập
Google, vào **Authentication → Settings → Authorized domains** và thêm domain đó vào danh sách
(mặc định domain `.web.app`/`.firebaseapp.com` đã tự động được thêm sẵn).

## Bước 6 — Thiết lập gửi email thật cho người bán (miễn phí qua EmailJS)
Mặc định Cloud Functions cần gói **Blaze** để gọi ra ngoài internet, nên bản này dùng **EmailJS**
(chạy thẳng trên trình duyệt, có gói miễn phí 200 email/tháng), không cần nâng cấp gói Firebase.

1. Đăng ký tại https://www.emailjs.com (miễn phí).
2. **Email Services → Add New Service** → chọn Gmail (hoặc dịch vụ khác) → kết nối tài khoản email
   bạn muốn dùng để gửi thông báo → lưu lại **Service ID**.
3. **Email Templates → Create New Template**. Nội dung mẫu:
   - To email: `{{to_email}}`
   - Subject: `Bạn có đơn đặt mua mới trên HPU LaptopMarket`
   - Nội dung:
     ```
     Xin chào {{to_name}},

     Bạn vừa có một đơn đặt mua mới cho sản phẩm "{{product_title}}" (giá {{price}}).

     Thông tin người mua:
     - Tên: {{buyer_name}}
     - SĐT: {{buyer_phone}}
     - Địa chỉ: {{buyer_address}}

     Mã đơn hàng: {{order_id}}
     Vui lòng đăng nhập HPU LaptopMarket để xác nhận đơn hàng.
     ```
   - Lưu lại **Template ID**.
4. **(Tùy chọn) Tạo thêm template thứ 2 để báo cho ADMIN khi có tin đăng mới cần duyệt**
   (dùng chung Service ID ở bước 2, chỉ cần thêm 1 template mới):
   - **Email Templates → Create New Template**.
   - To email: `{{to_email}}`
   - Subject: `Có tin đăng mới cần bạn duyệt trên HPU LaptopMarket`
   - Nội dung:
     ```
     Xin chào {{to_name}},

     Sinh viên {{seller_name}} (SĐT: {{seller_phone}}) vừa đăng bán sản phẩm
     "{{product_title}}" với giá {{listing_price}}, đang chờ bạn duyệt.

     Vui lòng đăng nhập HPU LaptopMarket → mục Quản trị để xem chi tiết và duyệt tin.
     ```
   - Lưu lại **Template ID** này — đây là giá trị cho `adminTemplateId`.
5. **Account → General** → lấy **Public Key**.
6. Dán các giá trị trên vào `emailjsConfig` trong `js/firebase-config.js`:
   ```js
   export const emailjsConfig = {
     publicKey: "...",
     serviceId: "...",
     templateId: "...",        // template gửi cho người bán khi có đơn mới
     adminTemplateId: "..."     // template gửi cho admin khi có tin mới cần duyệt (tùy chọn)
   };
   ```
7. Tải lại trang — từ giờ mỗi khi có đơn đặt mua mới, người bán sẽ nhận được email thật;
   mỗi khi có tin đăng mới, admin cũng nhận được email thật — song song với thông báo
   trong app.

Nếu bạn để trống `templateId` và/hoặc `adminTemplateId`, ứng dụng vẫn chạy bình thường —
chỉ bỏ qua đúng phần email tương ứng và vẫn dùng thông báo trong app (mục "Thông báo" trên
thanh điều hướng, giờ bấm vào được để đi thẳng tới trang liên quan).

## Ghi chú / giới hạn hiện tại
- **Chưa dùng Cloud Functions**: mọi logic (duyệt tin, đổi trạng thái đơn...) chạy phía client và
  được bảo vệ bằng Firestore Rules. Muốn chặt chẽ hơn (vd: không cho client tự đổi giá đơn hàng,
  tính toán hoa hồng...), nên chuyển các thao tác nhạy cảm sang Cloud Functions sau này.
- **Đọc dữ liệu**: các trang đang tải lại toàn bộ collection liên quan mỗi lần chuyển trang
  (không dùng realtime `onSnapshot` hay phân trang) để giữ code đơn giản, dễ đọc. Phù hợp cho vài
  trăm sản phẩm/đơn hàng. Nếu dữ liệu lớn hơn, nên thêm phân trang (`limit`, `startAfter`) và cân
  nhắc `onSnapshot` cho các danh sách cần cập nhật tức thời.
- **Ảnh lưu trong Firestore**: đơn giản, miễn phí, không cần Storage — nhưng khiến document
  nặng hơn và trang chủ tải chậm hơn một chút khi có nhiều tin đăng (vì tải cả ảnh mỗi lần
  vào trang). Với vài trăm tin đăng trong phạm vi một trường thì vẫn ổn. Nếu sau này cần mở
  rộng, cân nhắc chuyển sang Firebase Storage (gói Blaze) hoặc Cloudinary (xem mục "Về việc
  lưu ảnh sản phẩm" phía trên).
- **Xóa tin đăng**: xóa document là xóa luôn ảnh (vì ảnh nằm trong chính document đó), không
  cần dọn dẹp gì thêm.

## Có gì mới trong bản này

- **Đường dẫn riêng cho từng trang**: mỗi trang giờ có URL riêng (vd: `#/product?id=xyz`,
  `#/orders?tab=buy`, `#/seller?id=abc`). Reload trang, gửi link, hay bấm nút back/forward
  của trình duyệt đều hoạt động đúng, không bị đưa về trang chủ nữa.
- **Hồ sơ cá nhân** (bấm vào tên ở góc phải header): xem/sửa họ tên, số điện thoại, và đổi
  ảnh đại diện (ảnh cũng được nén nhỏ lại trước khi lưu vào Firestore, giống cách làm với
  ảnh sản phẩm — không cần Storage).
- **Trang "Đã hoàn tất"**: kho lưu toàn bộ sản phẩm đã giao dịch xong, kèm bình luận và
  đánh giá công khai của từng sản phẩm.
- **Trang "Xếp hạng"**: bảng xếp hạng người bán theo điểm đánh giá trung bình (sau đó theo
  số lượt đánh giá, rồi số đơn đã hoàn tất), có ô tìm kiếm theo tên.
- **Thông báo bấm được**: mỗi thông báo giờ có thể bấm vào để đi thẳng tới sản phẩm/đơn
  hàng/trang quản trị liên quan, đồng thời tự đánh dấu đã đọc.
- **Admin gỡ được tin đã duyệt**: ở mục Quản trị, admin có nút "Gỡ tin đăng" cho cả những
  tin đã duyệt/đang bán/đã bán (không chỉ tin chờ duyệt), người bán sẽ nhận thông báo khi
  bị gỡ.
- **Gửi email thật cho admin** khi có tin đăng mới cần duyệt (song song với thông báo
  trong app) — xem hướng dẫn thiết lập template thứ 2 ở Bước 6.
- **Đường viền/khung/ô nhập liệu rõ hơn**: tăng độ tương phản viền để giao diện dễ nhìn,
  dễ phân biệt các vùng nhập liệu hơn.
- **Dashboard quản trị** (`#/admin?tab=analytics`): thống kê tổng tin đăng, doanh thu,
  tài khoản hoạt động, điểm đánh giá trung bình, phân bổ trạng thái tin đăng, giao dịch
  mới nhất, top người bán và nhận xét gần đây.
- **Lịch sử gỡ bài** (`#/removed`): người bán xem được danh sách các tin đã bị admin gỡ
  kèm lý do, thời gian và tên admin — truy cập từ nút "Lịch sử gỡ bài" trên trang
  "Tin đăng của tôi".
- **Cập nhật realtime**: trang tự động cập nhật khi có thay đổi dữ liệu trong Firestore
  (sản phẩm, thông báo, đơn hàng) thông qua `onSnapshot` — không cần tải lại trang thủ công.
- **Quên mật khẩu có mã xác thực**: thay vì chỉ gửi email reset link, hệ thống gửi mã
  OTP 4 chữ số qua EmailJS để xác thực trước khi cho đổi mật khẩu (an toàn hơn, không
  cần Cloud Functions).

**Việc bạn cần làm sau khi tải bản này**: dán lại `firestore.rules` mới vào Firebase
Console → Firestore Database → Rules → Publish (rules mới thêm quyền cho admin xóa tin
đã duyệt). Không cần làm gì thêm với dữ liệu cũ — mọi thứ tương thích ngược.

## Lịch sử bản vá: vì sao tài khoản thường không thấy sản phẩm

**Triệu chứng**: đăng nhập bằng admin thì thấy sản phẩm bình thường, nhưng đăng nhập bằng
tài khoản khác thì trang chủ trống trơn hoặc báo lỗi tải dữ liệu.

**Nguyên nhân**: để tính "điểm uy tín người bán" (số đơn đã hoàn tất, sao đánh giá trung
bình) hiển thị trên mỗi sản phẩm, bản trước đọc thẳng toàn bộ collection `orders`. Nhưng
`orders` chứa dữ liệu riêng tư (SĐT, địa chỉ người mua), nên Security Rules chỉ cho phép
người mua/người bán liên quan tới **chính đơn hàng đó** được đọc — không cho đọc tràn lan.
Khi tài khoản thường (không phải admin) thử đọc *toàn bộ* `orders` để tính điểm uy tín,
Firestore từ chối **toàn bộ câu truy vấn đó** (không chỉ phần bị cấm), khiến cả trang chủ
gặp lỗi và không hiển thị được gì. Admin không gặp lỗi này vì rules có ngoại lệ cho phép
admin đọc mọi thứ.

**Cách sửa**: thay vì đọc `orders` trực tiếp, ứng dụng giờ lưu sẵn 2 con số công khai ngay
trên hồ sơ người bán (`users/{uid}`): `dealsCompleted` (số đơn đã hoàn tất) và
`ratingSum`/`ratingCount` (để tính sao trung bình). Hai con số này được cộng dồn đúng lúc
đơn hàng hoàn tất / có đánh giá mới (xem `buyerConfirmReceived` và `submitRating` trong
`js/main.js`), và Security Rules mới chỉ cho phép tăng đúng 1 đơn vị mỗi lần — không ai có
thể tự ý sửa thành số tuỳ ý. Nhờ vậy, việc hiển thị điểm uy tín không cần đọc dữ liệu riêng
tư của người khác nữa, và mọi tài khoản đều xem được sản phẩm bình thường.

Ngoài ra bản vá này cũng sửa thêm 2 lỗi liên quan cùng gốc rễ (Security Rules quá chặt):
- Người mua **đặt hàng** trước đó có thể bị từ chối âm thầm vì việc đổi trạng thái sản phẩm
  sang "đang được đặt" chỉ cho phép người bán/admin thực hiện. Rules mới cho phép người mua
  (hoặc người bán) đổi *riêng field trạng thái* giữa các mốc còn hàng/đang đặt/đã bán.
- Tương tự cho bước **xác nhận đã nhận hàng** và **hủy đơn**.

**Bạn cần làm gì**: dán lại nội dung `firestore.rules` (bản mới trong file zip này) vào
Firebase Console → Firestore Database → Rules → Publish, rồi tải lại trang là dùng được.

## Cấu trúc code đã được tách nhỏ (dễ chỉnh sửa/tìm kiếm)

Trước đây toàn bộ logic nằm trong 1 file `main.js` duy nhất (~1300 dòng). Bản này đã tách
thành 24 file nhỏ theo chức năng (xem mục "Cấu trúc thư mục" ở đầu file). Mỗi trang, mỗi
nhóm chức năng (modal, router, action đăng nhập...) nằm trong 1 file riêng — không thay đổi
gì về cách hoạt động, chỉ giúp bạn tìm và sửa code nhanh hơn.

## Các tính năng SEO/UX mới trong bản này

- **Trang 404 tùy chỉnh** (`js/pages/notfound.js`) — hiện khi vào link không tồn tại.
- **Breadcrumb điều hướng** trên hầu hết các trang (Trang chủ › ... › trang hiện tại).
- **Trang Câu hỏi thường gặp** (`js/pages/faq.js`) và **Chính sách bảo mật**
  (`js/pages/privacy.js`) — cả hai đều có link ở footer.
- **Tiêu đề tab trình duyệt riêng cho từng trang** (vd: "Dell Latitude 7420 — HPU LaptopMarket").
- **Thanh CTA dính đáy màn hình trên di động** (`#sticky-mobile-cta` trong `index.html`) —
  tự ẩn khi đang ở trang Đăng bán.
- **Ảnh chia sẻ mạng xã hội (Open Graph)**: `img/og-share.png`. Trước khi deploy, nhớ:
  1. Đổi `https://hpu-lm.web.app/` trong các thẻ `<meta property="og:...">` và
     `<link rel="canonical">` ở `index.html` thành đúng domain thật của bạn sau khi deploy.
  2. **Lưu ý quan trọng**: vì đây là ứng dụng single-page (SPA), khi ai đó dán link 1 sản
     phẩm cụ thể lên Facebook/Zalo, ảnh/tiêu đề xem trước **vẫn hiện chung 1 ảnh mặc định**
     (không phải ảnh sản phẩm đó) — vì các bot xem trước liên kết không chạy JavaScript nên
     không đọc được nội dung được render động. Muốn mỗi sản phẩm có ảnh chia sẻ riêng, cần
     dựng thêm một lớp render phía server (ví dụ Cloud Functions) — nhắn tôi nếu bạn muốn
     nâng cấp phần này sau.
- **Google Analytics (GA4)**: đã gắn sẵn khung trong `index.html`, chỉ cần thay
  `G-XXXXXXXXXX` (2 chỗ) bằng Measurement ID thật lấy từ analytics.google.com. Việc chuyển
  trang trong SPA cũng được theo dõi thủ công (xem hàm `trackPageView` trong `js/router.js`).
- **Alt text** cho toàn bộ ảnh sản phẩm, ảnh đại diện, ảnh thumbnail.
- Thêm liên kết nội bộ ở **footer** (Trang chủ, Đăng bán, Xếp hạng, Đã hoàn tất, FAQ,
  Chính sách bảo mật) giúp người dùng và công cụ tìm kiếm điều hướng dễ hơn.

Các mục sau **chưa làm** vì không phù hợp với một chợ nội bộ sinh viên (đã giải thích lý do
khi trao đổi trực tiếp): case studies, response time promise, map + directions, local
schema, robots.txt, team photo. Nhắn tôi nếu bạn đổi ý muốn thêm mục nào trong số này.
