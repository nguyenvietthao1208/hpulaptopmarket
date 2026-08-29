// ============================================================
// Trang thống kê Dashboard Quản trị (Admin Analytics)
// ============================================================
import { state } from '../state.js';
import { esc, fmtVND, fmtDate, setPageTitle, renderBreadcrumbs } from '../helpers.js';
import { fetchAll } from '../firestore-helpers.js';

async function pageAdminAnalytics(){
  setPageTitle('Dashboard Quản trị');
  if(!state.currentUser || state.currentUser.role !== 'admin'){
    return `<div class="wrap section page-fade"><div class="empty">Chỉ quản trị viên mới truy cập được trang này.</div></div>`;
  }

  const [products, users, orders, ratings] = await Promise.all([
    fetchAll('products'),
    fetchAll('users'),
    fetchAll('orders'),
    fetchAll('ratings')
  ]);

  const totalProducts = products.length;
  const pending = products.filter(p => p.status === 'pending').length;
  const approved = products.filter(p => ['approved','reserved'].includes(p.status)).length;
  const sold = products.filter(p => p.status === 'sold').length;
  const rejected = products.filter(p => p.status === 'rejected').length;

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  const activeUsers = users.length;
  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + (Number(r.stars) || 0), 0) / ratings.length).toFixed(1)
    : '0.0';

  const latestOrders = [...orders].sort((a, b) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt || 0) - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt || 0)).slice(0, 5);

  const topSellers = [...users]
    .map(u => ({
      id: u.id,
      name: u.name || 'Người dùng',
      completed: Number(u.dealsCompleted || 0),
      avg: u.ratingCount ? (Number(u.ratingSum || 0) / Number(u.ratingCount)).toFixed(1) : '0.0',
      ratingCount: Number(u.ratingCount || 0)
    }))
    .sort((a, b) => {
      if (b.completed !== a.completed) return b.completed - a.completed;
      if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
      return Number(b.avg) - Number(a.avg);
    })
    .slice(0, 5);

  const statusBars = [
    { label: 'Chờ duyệt', value: pending, color: 'pending' },
    { label: 'Đang bán', value: approved, color: 'approved' },
    { label: 'Đã bán', value: sold, color: 'sold' },
    { label: 'Bị từ chối', value: rejected, color: 'rejected' }
  ];

  const maxStatus = Math.max(...statusBars.map(s => s.value), 1);

  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Quản trị', page:'admin'}, {label:'Dashboard'}])}
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <span class="eyebrow">Admin Analytics</span>
        <h2>Dashboard Quản trị</h2>
      </div>
      <a href="#" class="btn btn-ghost btn-sm" onclick="nav('admin');return false;">Quay lại duyệt tin</a>
    </div>

    <div class="dashboard-grid">
      <div class="metric-card">
        <div class="metric-label">Tổng tin đăng</div>
        <div class="metric-value">${totalProducts}</div>
        <div class="metric-foot positive">${pending} đang chờ duyệt</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Doanh thu hoàn tất</div>
        <div class="metric-value">${fmtVND(totalRevenue)}</div>
        <div class="metric-foot positive">${sold} sản phẩm đã bán</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Tài khoản hoạt động</div>
        <div class="metric-value">${activeUsers}</div>
        <div class="metric-foot neutral">${ratings.length} lượt đánh giá</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Điểm đánh giá TB</div>
        <div class="metric-value">${avgRating}⭐</div>
        <div class="metric-foot neutral">Trung bình cộng</div>
      </div>
    </div>

    <div class="dashboard-row">
      <div class="panel">
        <h3>Phân bổ trạng thái tin đăng</h3>
        <div class="status-stack">
          ${statusBars.map(bar => `
            <div class="status-row">
              <div class="status-head">
                <span>${bar.label}</span>
                <strong>${bar.value}</strong>
              </div>
              <div class="status-line">
                <span class="status-fill ${bar.color}" style="width:${Math.max((bar.value / maxStatus) * 100, bar.value ? 12 : 0)}%"></span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel">
        <h3>Giao dịch mới nhất</h3>
        <div class="mini-list">
          ${latestOrders.length ? latestOrders.map(o => `
            <div class="mini-item">
              <div>
                <div class="mini-title">${esc(o.productTitle || '(Sản phẩm)')}</div>
                <div class="mini-sub">${esc(o.buyerName || 'Người mua')} · ${fmtVND(Number(o.price) || 0)}</div>
              </div>
              <span class="asset-tag ${o.status === 'completed' ? 'tag-approved' : o.status === 'cancelled' ? 'tag-rejected' : 'tag-pending'}">${o.status}</span>
            </div>
          `).join('') : '<div class="field hint">Chưa có đơn hàng nào.</div>'}
        </div>
      </div>
    </div>

    <div class="dashboard-row">
      <div class="panel">
        <h3>Top người bán</h3>
        <div class="mini-list">
          ${topSellers.length ? topSellers.map((u, idx) => `
            <div class="mini-item rank-item">
              <div class="rank-number">#${idx + 1}</div>
              <div class="rank-content">
                <div class="mini-title">${esc(u.name)}</div>
                <div class="mini-sub">${u.completed} giao dịch hoàn tất · ${u.avg}⭐</div>
              </div>
            </div>
          `).join('') : '<div class="field hint">Chưa có dữ liệu người bán.</div>'}
        </div>
      </div>

      <div class="panel">
        <h3>Nhận xét gần đây</h3>
        <div class="mini-list">
          ${ratings.length ? [...ratings].sort((a, b) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt || 0) - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt || 0)).slice(0, 5).map(r => `
            <div class="mini-item rating-item">
              <div>
                <div class="mini-title">${esc(r.productTitle || 'Sản phẩm')}</div>
                <div class="mini-sub">${'★'.repeat(Number(r.stars) || 0)}${'☆'.repeat(Math.max(5 - (Number(r.stars) || 0), 0))} · ${esc(r.buyerName || 'Khách hàng')}</div>
              </div>
              <span class="mini-time">${fmtDate(r.createdAt)}</span>
            </div>
          `).join('') : '<div class="field hint">Chưa có đánh giá nào.</div>'}
        </div>
      </div>
    </div>
  </div>`;
}

export { pageAdminAnalytics };
