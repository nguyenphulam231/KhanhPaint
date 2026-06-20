function getAdminToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/admin/login";
    return null;
  }
  return token;
}

function clearAdminToken() {
  localStorage.removeItem("token");
}

function initAdminShell() {
  const token = getAdminToken();
  if (!token) return;

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      clearAdminToken();
      window.location.href = "/admin/login";
    });
  }
}

function renderAdminSidebar(activeNav) {
  return `
    <aside class="sidebar">
      <h3>Quản trị hệ thống</h3>
      <a class="menu-item ${activeNav === "dashboard" ? "active" : ""}" data-admin-nav="dashboard" href="/admin/">Bảng điều khiển</a>
      <a class="menu-item ${activeNav === "jobs" ? "active" : ""}" data-admin-nav="jobs" href="/admin/job-manage.html">Tạo vị trí công việc</a>
      <a class="menu-item ${activeNav === "employees" ? "active" : ""}" data-admin-nav="employees" href="/admin/employee-manage.html">Thêm nhân viên</a>
      <a class="menu-item ${activeNav === "brands" ? "active" : ""}" data-admin-nav="brands" href="/admin/brand-manage.html">Quản lý Thương hiệu</a>
      <a class="menu-item ${activeNav === "lines" ? "active" : ""}" data-admin-nav="lines" href="/admin/line-manage.html">Quản lý Dòng SP</a>
      <a class="menu-item ${activeNav === "basetypes" ? "active" : ""}" data-admin-nav="basetypes" href="/admin/basetype-manage.html">Quản lý BaseTypes</a>
      <a class="menu-item ${activeNav === "variants" ? "active" : ""}" data-admin-nav="variants" href="/admin/variant-manage.html">Quản lý Product Variant</a>
      <a class="menu-item" href="#" id="logoutLink" style="color: #ffcccc">Đăng xuất</a>
    </aside>
  `;
}

function mountAdminSidebar(activeNav) {
  const sidebarHost = document.getElementById("admin-sidebar");
  if (!sidebarHost) return;

  sidebarHost.innerHTML = renderAdminSidebar(activeNav);
}

async function loadJobsIntoSelect(selectId) {
  const token = getAdminToken();
  if (!token) return;

  const response = await fetch(API_ROUTES.GET_JOBS, {
    headers: { Authorization: "Bearer " + token },
  });
  const jobs = await response.json();
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">-- Chọn vị trí công việc --</option>';
  jobs.forEach((job) => {
    select.innerHTML += `<option value="${job.job_id}">${job.job_title}</option>`;
  });
}

async function loadBrandsIntoSelect(selectId) {
  const token = getAdminToken();
  if (!token) return;

  const response = await fetch(API_ROUTES.GET_BRANDS, {
    headers: { Authorization: "Bearer " + token },
  });
  const brands = await response.json();
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
  brands.forEach((brand) => {
    select.innerHTML += `<option value="${brand.brand_id}">${brand.name}</option>`;
  });
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
  const token = getAdminToken();
  if (!token) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(API_ROUTES.DASHBOARD, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await response.json();
    const orders = Array.isArray(data.data) ? data.data : [];

    target.innerHTML = `
      <div class="admin-stats">
        <div class="stat-card">
          <strong>${orders.length}</strong>
          <span>Bản ghi dashboard</span>
        </div>
        <div class="stat-card">
          <strong>Đã kết nối</strong>
          <span>API admin</span>
        </div>
      </div>
      <div class="content-card">
        <pre class="json-panel">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
      </div>
    `;
  } catch (error) {
    console.error("Không thể tải dashboard:", error);
    target.innerHTML =
      '<div class="content-card">Không thể tải dữ liệu dashboard.</div>';
  }
}
