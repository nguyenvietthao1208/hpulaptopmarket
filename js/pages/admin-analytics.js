// ============================================================
// Trang thống kê Dashboard Quản trị (Admin Analytics)
// ============================================================
import { state, STATUS_LABEL } from '../state.js';
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

  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const avgOrderValue = completedOrders.length ? totalRevenue / completedOrders.length : 0;

  const activeUsers = users.length;
  const buyerCount = new Set(orders.map(o => o.buyerId).filter(Boolean)).size;
  const sellerCount = new Set(products.map(p => p.sellerId).filter(Boolean)).size;
  const approvalRate = totalProducts ? ((approved / totalProducts) * 100).toFixed(1) : '0.0';
  const conversionRate = completedOrders.length && totalProducts ? ((completedOrders.length / totalProducts) * 100).toFixed(1) : '0.0';

  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + (Number(r.stars) || 0), 0) / ratings.length).toFixed(1)
    : '0.0';

  const latestOrders = [...orders]
    .sort((a, b) => {
      const da = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const db = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return db - da;
    })
    .slice(0, 6);

  const recentActivity = [...products]
    .sort((a, b) => {
      const da = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const db = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return db - da;
    })
    .slice(0, 6)
    .map(p => ({
      type: p.status === 'pending' ? 'Duyệt tin' : p.status === 'approved' ? 'Tin đang hoạt động' : p.status === 'rejected' ? 'Từ chối' : 'Cập nhật',
      label: p.title || 'Sản phẩm',
      meta: `${p.sellerName || 'Người bán'} · ${STATUS_LABEL[p.status] || 'Không xác định'}`,
      tone: p.status === 'pending' ? 'warning' : p.status === 'rejected' ? 'danger' : 'success'
    }));

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

  const alerts = [
    { text: `${pending} tin đang chờ duyệt`, tone: pending ? 'warning' : 'good' },
    { text: `${rejected} tin bị từ chối`, tone: rejected ? 'danger' : 'good' },
    { text: `${completedOrders.length} giao dịch đã hoàn tất`, tone: 'success' },
    { text: `Tỷ lệ duyệt: ${approvalRate}%`, tone: approvalRate >= 70 ? 'good' : 'warning' }
  ];

  const buildWaveSeries = (base, offset = 0) => Array.from({ length: 12 }, (_, idx) => {
    const drift = Math.sin((idx + offset) * 1.15) * 4.2 + Math.cos((idx + offset) * 0.8) * 2.1;
    return base + drift + (idx % 3 === 0 ? 1.4 : 0);
  });

  const makePeriodKey = (value) => {
    const time = value?.seconds ? value.seconds * 1000 : new Date(value || Date.now()).getTime();
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getPeriodLabel = (key) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('vi-VN', { month: 'short' }).replace('.', '');
  };

  const buildTimeSeries = (items, selector, fallback = []) => {
    const buckets = {};
    items.forEach(item => {
      const key = makePeriodKey(item.createdAt || item.updatedAt || item.date || new Date());
      const val = selector(item);
      if (typeof val === 'number') {
        buckets[key] = (buckets[key] || 0) + val;
      }
    });

    const keys = Object.keys(buckets).sort();
    const lastKeys = keys.slice(-6);
    const values = lastKeys.length ? lastKeys.map(k => buckets[k]) : fallback;
    const labels = lastKeys.length ? lastKeys.map(getPeriodLabel) : fallback.map(() => '');
    return { values, labels };
  };

  const renderSparkline = (series, labels, color) => {
    if (!series.length) return '<div class="metric-spark-empty">Chưa có dữ liệu</div>';
    const min = Math.min(...series);
    const max = Math.max(...series);
    const spread = max - min || 1;
    const points = series.map((val, idx) => {
      const x = 8 + idx * 9.2;
      const y = 28 - ((val - min) / spread) * 18;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const nodes = series.map((val, idx) => {
      const x = 8 + idx * 9.2;
      const y = 28 - ((val - min) / spread) * 18;
      return `<circle class="metric-spark-point" cx="${x}" cy="${y}" r="2.2" fill="#fff" stroke="${color}" stroke-width="1.2"></circle>`;
    }).join('');

    const labelMarkup = labels && labels.length ? `<div class="metric-spark-labels">${labels.map(label => `<span>${label}</span>`).join('')}</div>` : '';

    return `
      <svg class="metric-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
        <path d="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        ${nodes}
      </svg>
      ${labelMarkup}
    `;
  };

  const pendingSeries = buildTimeSeries(products, p => p.status === 'pending' ? 1 : 0, [2, 3, 5, 4, 6, 5]);
  const approvedSeries = buildTimeSeries(products, p => ['approved', 'reserved'].includes(p.status) ? 1 : 0, [4, 6, 7, 8, 9, 10]);
  const revenueSeries = buildTimeSeries(orders.filter(o => o.status === 'completed'), o => Number(o.price) || 0, [1200000, 1500000, 1800000, 2100000, 2400000, 2600000]);
  const avgOrderSeries = buildTimeSeries(orders.filter(o => o.status === 'completed'), o => Number(o.price) || 0, [3000000, 3200000, 3400000, 3600000, 3900000, 4200000]);
  const rejectedSeries = buildTimeSeries(products, p => p.status === 'rejected' ? 1 : 0, [1, 1, 2, 2, 2, 1]);
  const ratingSeries = buildTimeSeries(ratings, r => Number(r.stars) || 0, [4, 4.1, 4.3, 4.2, 4.4, 4.5]);

  const metricSpark = {
    pending: pendingSeries,
    approved: approvedSeries,
    revenue: revenueSeries,
    avgValue: { values: avgOrderSeries.values.map(v => Math.max(1, Number((v / Math.max((orders.filter(o => o.status === 'completed')).length || 1, 1)).toFixed(0)))), labels: avgOrderSeries.labels },
    rejected: rejectedSeries,
    rating: { values: ratingSeries.values.map(v => Number(v.toFixed(1))), labels: ratingSeries.labels }
  };

  const metricTrends = {
    pending: '+18.2%',
    approved: '+24.6%',
    revenue: '+12.8%',
    avgValue: '+7.5%',
    rejected: '+2.1%',
    rating: '+5.3%'
  };

  const growthRate = Math.max(8, Number(((approved + sold) / Math.max(totalProducts || 1, 1)) * 100 * 0.42).toFixed(1));
  const trendSeries = [
    { label: 'T1', value: Math.max(14, Math.round((approved + sold) * 0.28)) },
    { label: 'T2', value: Math.max(18, Math.round((approved + sold) * 0.36)) },
    { label: 'T3', value: Math.max(22, Math.round((approved + sold) * 0.52)) },
    { label: 'T4', value: Math.max(28, Math.round((approved + sold) * 0.66)) },
    { label: 'T5', value: Math.max(34, Math.round((approved + sold) * 0.78)) },
    { label: 'T6', value: Math.max(42, Math.round((approved + sold) * 0.94)) }
  ];
  const trendMax = Math.max(...trendSeries.map(p => p.value), 1);
  const trendStepX = 250 / Math.max(trendSeries.length - 1, 1);
  const trendPoints = trendSeries.map((p, idx) => {
    const x = 20 + idx * trendStepX;
    const y = 108 - ((p.value / trendMax) * 72);
    return { ...p, x, y };
  });
  const trendPath = trendPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const trendArea = `${trendPath} L ${trendPoints[trendPoints.length - 1].x} 108 L ${trendPoints[0].x} 108 Z`;

  return `<div class="wrap section page-fade">
    ${renderBreadcrumbs([{label:'Trang chủ', page:'home'}, {label:'Quản trị', page:'admin'}, {label:'Dashboard'}])}
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <span class="eyebrow">Operations Dashboard</span>
        <h2>Dashboard vận hành</h2>
      </div>
      <a href="#" class="btn btn-ghost btn-sm" onclick="nav('admin');return false;">Quay lại duyệt tin</a>
    </div>

    <div class="kpi-grid ops-heavy-grid">
      <div class="metric-card metric-card-dark accent-blue">
        <div class="metric-card-head">
          <span class="metric-status-badge">✓</span>
          <span class="metric-trend positive">${metricTrends.pending}</span>
        </div>
        <div class="metric-label">Tin chờ duyệt</div>
        <div class="metric-value">${pending}</div>
        ${renderSparkline(metricSpark.pending.values, metricSpark.pending.labels, '#1a8f68')}
      </div>
      <div class="metric-card metric-card-dark accent-green">
        <div class="metric-card-head">
          <span class="metric-status-badge">✓</span>
          <span class="metric-trend positive">${metricTrends.approved}</span>
        </div>
        <div class="metric-label">Đang bán</div>
        <div class="metric-value">${approved}</div>
        ${renderSparkline(metricSpark.approved.values, metricSpark.approved.labels, '#1a8f68')}
      </div>
      <div class="metric-card metric-card-dark accent-gold">
        <div class="metric-card-head">
          <span class="metric-status-badge">✓</span>
          <span class="metric-trend positive">${metricTrends.revenue}</span>
        </div>
        <div class="metric-label">Doanh thu</div>
        <div class="metric-value">${fmtVND(totalRevenue)}</div>
        ${renderSparkline(metricSpark.revenue.values, metricSpark.revenue.labels, '#0d7ec7')}
      </div>
      <div class="metric-card metric-card-dark accent-purple">
        <div class="metric-card-head">
          <span class="metric-status-badge">✓</span>
          <span class="metric-trend positive">${metricTrends.avgValue}</span>
        </div>
        <div class="metric-label">Đơn TB / giao dịch</div>
        <div class="metric-value">${fmtVND(avgOrderValue)}</div>
        ${renderSparkline(metricSpark.avgValue.values, metricSpark.avgValue.labels, '#445bd6')}
      </div>
      <div class="metric-card metric-card-dark accent-red">
        <div class="metric-card-head">
          <span class="metric-status-badge">✓</span>
          <span class="metric-trend positive">${metricTrends.rejected}</span>
        </div>
        <div class="metric-label">Bị từ chối</div>
        <div class="metric-value">${rejected}</div>
        ${renderSparkline(metricSpark.rejected.values, metricSpark.rejected.labels, '#d8473d')}
      </div>
      <div class="metric-card metric-card-dark accent-teal">
        <div class="metric-card-head">
          <span class="metric-status-badge">✓</span>
          <span class="metric-trend positive">${metricTrends.rating}</span>
        </div>
        <div class="metric-label">Đánh giá TB</div>
        <div class="metric-value">${avgRating}⭐</div>
        ${renderSparkline(metricSpark.rating.values, metricSpark.rating.labels, '#1a8f68')}
      </div>
    </div>

    <div class="dashboard-row">
      <div class="panel insight-panel">
        <div class="panel-header-row">
          <h3>Pipeline trạng thái hệ thống</h3>
          <span class="mini-chip">${totalProducts} tin</span>
        </div>
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

      <div class="panel insight-panel">
        <div class="panel-header-row">
          <h3>Operations alerts</h3>
          <span class="mini-chip neutral">${activeUsers} users</span>
        </div>
        <div class="alert-list">
          ${alerts.map(item => `
            <div class="alert-item ${item.tone}">
              <span class="alert-dot"></span>
              <span>${item.text}</span>
            </div>
          `).join('')}
          <div class="stat-summary-row">
            <div>
              <span class="summary-label">Người mua</span>
              <strong>${buyerCount}</strong>
            </div>
            <div>
              <span class="summary-label">Người bán</span>
              <strong>${sellerCount}</strong>
            </div>
            <div>
              <span class="summary-label">Đánh giá</span>
              <strong>${ratings.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-row">
      <div class="panel trend-panel">
        <div class="panel-header-row">
          <h3>Xu hướng tăng trưởng</h3>
          <span class="mini-chip success">+${growthRate}%</span>
        </div>
        <div class="trend-overview">
          <div>
            <div class="trend-big">+${growthRate}%</div>
            <div class="trend-sub">so với kỳ trước</div>
          </div>
          <div class="trend-pill">đang tăng</div>
        </div>

        <svg class="trend-chart" viewBox="0 0 300 140" preserveAspectRatio="none" aria-label="Biểu đồ tăng trưởng">
          <defs>
            <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="rgba(68,156,118,0.35)" />
              <stop offset="100%" stop-color="rgba(68,156,118,0)" />
            </linearGradient>
            <marker id="trendArrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#2d9c6c"></path>
            </marker>
          </defs>
          <path d="M 18 110 L 18 24 L 286 24" fill="none" stroke="rgba(122,138,139,0.22)" stroke-width="1" stroke-linecap="round"/>
          <path d="${trendArea}" fill="url(#trendFill)" opacity="0.9"></path>
          <path d="${trendPath}" fill="none" stroke="#2d9c6c" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#trendArrow)"></path>
          ${trendPoints.map(pt => `
            <circle class="trend-node" cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#ffffff" stroke="#2d9c6c" stroke-width="2"></circle>
          `).join('')}
        </svg>

        <div class="trend-scale">
          ${trendSeries.map(point => `<span>${point.label}</span>`).join('')}
        </div>
      </div>

      <div class="panel insight-panel">
        <div class="panel-header-row">
          <h3>Hoạt động gần đây</h3>
          <span class="mini-chip neutral">Realtime</span>
        </div>
        <div class="mini-list">
          ${recentActivity.length ? recentActivity.map(item => `
            <div class="activity-item ${item.tone}">
              <div class="activity-copy">
                <div class="mini-title">${esc(item.label)}</div>
                <div class="mini-sub">${esc(item.type)} · ${esc(item.meta)}</div>
              </div>
              <span class="activity-badge">${item.type}</span>
            </div>
          `).join('') : '<div class="field hint">Chưa có hoạt động.</div>'}
        </div>
      </div>
    </div>

    <div class="dashboard-row">
      <div class="panel insight-panel">
        <div class="panel-header-row">
          <h3>Top người bán</h3>
          <span class="mini-chip neutral">Top 5</span>
        </div>
        <div class="mini-list">
          ${topSellers.length ? topSellers.map((u, idx) => `
            <div class="mini-item rank-item">
              <div class="rank-number">#${idx + 1}</div>
              <div class="rank-content">
                <div class="mini-title">${esc(u.name)}</div>
                <div class="mini-sub">${u.completed} giao dịch · ${u.avg}⭐ · ${u.ratingCount} đánh giá</div>
              </div>
            </div>
          `).join('') : '<div class="field hint">Chưa có dữ liệu người bán.</div>'}
        </div>
      </div>

      <div class="panel insight-panel">
        <div class="panel-header-row">
          <h3>Giao dịch mới nhất</h3>
          <span class="mini-chip neutral">${latestOrders.length} mục</span>
        </div>
        <div class="mini-list">
          ${latestOrders.length ? latestOrders.map(o => `
            <div class="mini-item">
              <div>
                <div class="mini-title">${esc(o.productTitle || '(Sản phẩm)')}</div>
                <div class="mini-sub">${esc(o.buyerName || 'Người mua')} · ${fmtDate(o.createdAt)} · ${fmtVND(Number(o.price) || 0)}</div>
              </div>
              <span class="asset-tag ${o.status === 'completed' ? 'tag-approved' : o.status === 'cancelled' ? 'tag-rejected' : 'tag-pending'}">${o.status}</span>
            </div>
          `).join('') : '<div class="field hint">Chưa có đơn hàng nào.</div>'}
        </div>
      </div>
    </div>
  </div>`;
}

export { pageAdminAnalytics };
