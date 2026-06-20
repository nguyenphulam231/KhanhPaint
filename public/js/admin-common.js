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

    target.innerHTML = `
      <div class="admin-stats">
        <div class="stat-card"><strong>${escapeHtml(data.total_employees ?? 0)}</strong><span>Nhân viên</span></div>
        <div class="stat-card"><strong>${escapeHtml(data.total_customers ?? 0)}</strong><span>Khách hàng</span></div>
        <div class="stat-card"><strong>${escapeHtml(data.total_orders ?? 0)}</strong><span>Đơn hàng</span></div>
        <div class="stat-card"><strong>${Number(data.total_revenue || 0).toLocaleString("vi-VN")} VND</strong><span>Doanh thu</span></div>
        <div class="stat-card"><strong>${escapeHtml(data.low_stock_products ?? 0)}</strong><span>Sơn gốc sắp hết</span></div>
        <div class="stat-card"><strong>${escapeHtml(data.low_stock_colorants ?? 0)}</strong><span>Tinh màu sắp hết</span></div>
      </div>
      <div class="content-card">
        <pre class="json-panel">${escapeHtml(JSON.stringify(result, null, 2))}</pre>
      </div>
    `;
  } catch (error) {
    console.error("Không thể tải dashboard:", error);
    target.innerHTML = '<div class="content-card">Không thể tải dữ liệu dashboard.</div>';
  }
}
