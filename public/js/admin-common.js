function getAdminToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/admin/login.html";
    return null;
  }
  return token;
}

function clearAdminToken() {
  clearAuthData();
}

function initAdminShell() {
  const token = getAdminToken();
  if (!token) return;

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      clearAdminToken();
      window.location.href = "/admin/login.html";
    });
  }
}

function renderAdminSidebar(activeNav) {
  return `
    <aside class="sidebar">
      <h3>Quản trị hệ thống</h3>
      <a class="menu-item ${activeNav === "dashboard" ? "active" : ""}" href="/admin/">Bảng điều khiển</a>
      <a class="menu-item ${activeNav === "inventory" ? "active" : ""}" href="/admin/inventory.html">Tồn kho kép</a>
      <a class="menu-item ${activeNav === "colors" ? "active" : ""}" href="/admin/color-formulas.html">Công thức màu</a>
      <a class="menu-item ${activeNav === "orders" ? "active" : ""}" href="/admin/orders.html">Đơn hàng</a>
      <a class="menu-item ${activeNav === "customers" ? "active" : ""}" href="/admin/customers.html">Khách hàng & công nợ</a>
      <a class="menu-item ${activeNav === "reports" ? "active" : ""}" href="/admin/reports.html">Báo cáo</a>
      <a class="menu-item ${activeNav === "jobs" ? "active" : ""}" href="/admin/job-manage.html">Tạo vị trí công việc</a>
      <a class="menu-item ${activeNav === "employees" ? "active" : ""}" href="/admin/employee-manage.html">Thêm nhân viên</a>
      <a class="menu-item ${activeNav === "brands" ? "active" : ""}" href="/admin/brand-manage.html">Quản lý thương hiệu</a>
      <a class="menu-item ${activeNav === "lines" ? "active" : ""}" href="/admin/line-manage.html">Quản lý dòng SP</a>
      <a class="menu-item ${activeNav === "basetypes" ? "active" : ""}" href="/admin/basetype-manage.html">Quản lý BaseTypes</a>
      <a class="menu-item ${activeNav === "variants" ? "active" : ""}" href="/admin/variant-manage.html">Quản lý Product Variant</a>
      <a class="menu-item" href="#" id="logoutLink" style="color: #ffcccc">Đăng xuất</a>
    </aside>
  `;
}

function mountAdminSidebar(activeNav) {
  const sidebarHost = document.getElementById("admin-sidebar");
  if (!sidebarHost) return;
  sidebarHost.innerHTML = renderAdminSidebar(activeNav);
}

function setSelectOptions(select, options, placeholder, valueKey, labelKey) {
  select.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
}

async function loadJobsIntoSelect(selectId) {
  getAdminToken();
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const jobs = await apiRequest(API_ROUTES.GET_JOBS);
    setSelectOptions(select, jobs, "-- Chọn vị trí công việc --", "job_id", "job_title");
  } catch (error) {
    console.error("Không thể tải vị trí công việc:", error);
  }
}

async function loadBrandsIntoSelect(selectId) {
  getAdminToken();
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const brands = await apiRequest(API_ROUTES.GET_BRANDS);
    setSelectOptions(select, brands, "-- Chọn thương hiệu --", "brand_id", "name");
  } catch (error) {
    console.error("Không thể tải thương hiệu:", error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function renderDashboardSummary(targetId) {
  getAdminToken();
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const result = await apiRequest(API_ROUTES.DASHBOARD);
    const data = result.data || {};
    const revenue = await apiRequest(`${API_ROUTES.GET_REVENUE_REPORT}?group=monthly`).catch(() => []);
    const lowProducts = await apiRequest(`${API_ROUTES.GET_INVENTORY_PRODUCTS}?status=low`).catch(() => []);
    const lowColorants = await apiRequest(`${API_ROUTES.GET_INVENTORY_COLORANTS}?status=low`).catch(() => []);

    const revenueRows = revenue
      .slice(0, 6)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.period)}</td>
            <td>${escapeHtml(item.total_orders)}</td>
            <td>${formatCurrency(item.revenue)}</td>
          </tr>`
      )
      .join("");

    const lowProductRows = lowProducts
      .slice(0, 5)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.sku_code)}</td>
            <td>${escapeHtml(item.brand_name)} / ${escapeHtml(item.line_name)}</td>
            <td>${escapeHtml(item.base_name)} ${escapeHtml(item.volume || "")}</td>
            <td>${escapeHtml(item.stock_quantity)}</td>
          </tr>`
      )
      .join("");

    const lowColorantRows = lowColorants
      .slice(0, 5)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.colorant_name)}</td>
            <td>${formatNumber(item.stock_ml, " ml")}</td>
            <td><span class="${getStockBadgeClass(item.stock_status)}">${escapeHtml(item.stock_status)}</span></td>
          </tr>`
      )
      .join("");

    target.innerHTML = `
      <div class="admin-stats enhanced">
        <div class="stat-card"><span class="stat-label">Nhân viên</span><strong>${escapeHtml(data.total_employees ?? 0)}</strong></div>
        <div class="stat-card"><span class="stat-label">Khách hàng</span><strong>${escapeHtml(data.total_customers ?? 0)}</strong></div>
        <div class="stat-card"><span class="stat-label">Đơn hàng</span><strong>${escapeHtml(data.total_orders ?? 0)}</strong></div>
        <div class="stat-card highlight"><span class="stat-label">Doanh thu</span><strong>${formatCurrency(data.total_revenue)}</strong></div>
        <div class="stat-card warning-card"><span class="stat-label">Sơn gốc sắp hết</span><strong>${escapeHtml(data.low_stock_products ?? 0)}</strong></div>
        <div class="stat-card warning-card"><span class="stat-label">Tinh màu sắp hết</span><strong>${escapeHtml(data.low_stock_colorants ?? 0)}</strong></div>
        <div class="stat-card"><span class="stat-label">Tổng công nợ</span><strong>${formatCurrency(data.total_debt)}</strong></div>
      </div>

      <div class="dashboard-grid">
        <section class="content-card">
          <div class="section-title-row">
            <h2>Doanh thu gần đây</h2>
            <a class="action-link compact" href="/admin/reports.html">Xem báo cáo</a>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Kỳ</th><th>Số đơn</th><th>Doanh thu</th></tr></thead>
              <tbody>${revenueRows || '<tr><td colspan="3">Chưa có dữ liệu doanh thu.</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="content-card">
          <div class="section-title-row">
            <h2>Cảnh báo sơn gốc</h2>
            <a class="action-link compact" href="/admin/inventory.html">Xem kho</a>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>SKU</th><th>Nhóm sản phẩm</th><th>Base</th><th>Tồn</th></tr></thead>
              <tbody>${lowProductRows || '<tr><td colspan="4">Không có sản phẩm sắp hết.</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="content-card">
          <div class="section-title-row">
            <h2>Cảnh báo tinh màu</h2>
            <a class="action-link compact" href="/admin/inventory.html">Xem tinh màu</a>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Tinh màu</th><th>Tồn kho</th><th>Trạng thái</th></tr></thead>
              <tbody>${lowColorantRows || '<tr><td colspan="3">Không có tinh màu sắp hết.</td></tr>'}</tbody>
            </table>
          </div>
        </section>

        <section class="content-card quick-actions-card">
          <h2>Truy vấn nhanh</h2>
          <div class="quick-action-grid">
            <a href="/admin/color-formulas.html">Tra cứu mã màu</a>
            <a href="/admin/orders.html">Xem đơn hàng</a>
            <a href="/admin/customers.html">Lịch sử khách hàng</a>
            <a href="/admin/variant-manage.html">Thêm Product Variant</a>
          </div>
        </section>
      </div>
    `;
  } catch (error) {
    console.error("Không thể tải dashboard:", error);
    target.innerHTML = '<div class="content-card">Không thể tải dữ liệu dashboard.</div>';
  }
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}

function formatNumber(value, suffix = "") {
  const number = Number(value || 0);
  return `${number.toLocaleString("vi-VN")}${suffix}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN");
}

function getStockBadgeClass(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("hết") || text.includes("vượt")) return "badge danger";
  if (text.includes("sắp") || text.includes("nợ")) return "badge warning";
  return "badge success";
}

function showPanelMessage(targetId, message, type = "info") {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `<div class="message-panel ${type}">${escapeHtml(message)}</div>`;
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
