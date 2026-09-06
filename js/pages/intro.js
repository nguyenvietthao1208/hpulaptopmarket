// ============================================================
// Trang giới thiệu mở đầu — video nền và các lối vào chính của HPU LM.
// ============================================================
function pageIntro(){
  document.title = 'HPU LM — Mua bán laptop trong cộng đồng HPU';
  return `<section class="intro-page" aria-label="Giới thiệu HPU LaptopMarket">
    <div class="intro-kinetic-anchor"><video autoplay muted loop playsinline poster="img/og-share.png"><source src="video/video.mp4" type="video/mp4"></video></div>
    <div class="intro-optical-flare"></div>
    <nav class="intro-nav">
      <a class="intro-brand" href="#/intro" onclick="nav('intro');return false;" aria-label="HPU LM"><span class="intro-brand-mark">H</span><span>HPU <b>LM</b></span></a>
      <div class="intro-nav-links"><a href="#" onclick="nav('community');return false;">Quy định cộng đồng</a><a href="#" onclick="nav('privacy');return false;">Chính sách bảo mật</a><a href="#" onclick="nav('faq');return false;">Câu hỏi thường gặp</a></div>
      <div class="intro-nav-actions"><button class="intro-icon-btn" type="button" onclick="toggleDarkMode()" title="Chuyển đổi giao diện" aria-label="Chuyển đổi giao diện">◐</button><button class="intro-text-btn" type="button" onclick="openAuth('login')">Đăng nhập</button></div>
    </nav>
    <main class="intro-main">
      <section class="intro-hero">
        <div class="intro-hero-glass">
          <div class="intro-kicker"><span></span> HPU STUDENT MARKETPLACE <span>2026</span></div>
          <h1>Không gian mua bán.<br><strong>Niềm tin tuyệt đối.</strong></h1>
        </div>
        <p class="intro-lead">Tìm, bán và trao đổi laptop cũ trong cộng đồng sinh viên HPU, với thông tin rõ ràng và người bán đáng tin cậy.</p>
        <div class="intro-actions"><button class="intro-enter-btn" type="button" onclick="nav('home')">Vào chợ <span>↗</span></button><button class="intro-outline-btn" type="button" onclick="document.getElementById('intro-features').scrollIntoView({behavior:'smooth'})">Khám phá nền tảng</button></div>
      </section>
      <section id="intro-features" class="intro-asymmetric-hub intro-scroll-assembly">
        <div class="intro-feature-stack">
          <article class="intro-lens-card"><span class="intro-card-icon">⌁</span><h3>Tìm đúng thiết bị</h3><p>Bộ lọc cấu hình, hãng và mức giá giúp bạn tìm chiếc laptop phù hợp nhanh hơn.</p></article>
          <article class="intro-lens-card intro-card-offset"><span class="intro-card-icon">◇</span><h3>Người bán rõ ràng</h3><p>Hồ sơ, đánh giá và lịch sử giao dịch giúp mọi quyết định mua bán có thêm cơ sở.</p></article>
        </div>
        <article id="intro-safety" class="intro-lens-card intro-safety-card"><div class="intro-card-glow"></div><div class="intro-safety-copy"><h2>Giao dịch trong cộng đồng.</h2><p>Tin đăng được kiểm duyệt, trạng thái đơn hàng được cập nhật theo thời gian thực và thông tin cá nhân được bảo vệ.</p><button class="intro-link-btn" type="button" onclick="nav('community')">Đọc quy định cộng đồng <span>↗</span></button></div></article>
      </section>
      <section class="intro-final intro-scroll-assembly"><div class="intro-lens-card"><span class="intro-aperture">✦</span><h2>Bắt đầu hành trình.</h2><p>Không gian mua bán laptop dành riêng cho sinh viên HPU đang chờ bạn.</p><button class="intro-enter-btn" type="button" onclick="nav('home')">Khám phá HPU LM <span>↗</span></button></div></section>
    </main>
    <div class="intro-footer"><span>HPU LaptopMarket</span><span class="intro-scroll">SCROLL TO EXPLORE <b>↓</b></span><span>Hải Phòng / Việt Nam</span></div>
  </section>`;
}

export { pageIntro };
