function getAdminToken() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  if (!token) {
    window.location.href = "/admin/login";
    return null;
  }
  return token;
}

function clearAdminToken() {
  localStorage.removeItem("adminToken");
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
      <a class="menu-item ${activeNav === "colorants" ? "active" : ""}" data-admin-nav="colorants" href="/admin/colorant-manage.html">Quản lý Tinh màu</a>
      <a class="menu-item ${activeNav === "colorsystem" ? "active" : ""}" data-admin-nav="colorsystem" href="/admin/colorsystem-manage.html">Quản lý Mã màu</a>
      <a class="menu-item ${activeNav === "shifts" ? "active" : ""}" data-admin-nav="shifts" href="/admin/shift-manage.html">Quản lý Ca làm</a>
      <a class="menu-item ${activeNav === "assign-shift" ? "active" : ""}" data-admin-nav="assign-shift" href="/admin/shift-assign.html">Phân ca làm việc</a>
      <a class="menu-item ${activeNav === "orders" ? "active" : ""}" data-admin-nav="orders" href="/admin/order-manage.html">Quản lý đơn hàng</a>
      <a class="menu-item ${activeNav === "customers" ? "active" : ""}" data-admin-nav="customers" href="/admin/customer-manage.html">Quản lý khách hàng</a>
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

async function loadBaseTypesIntoSelect(selectId) {
  const token = getAdminToken();
  if (!token) return;

  try {
    const response = await fetch(API_ROUTES.GET_BASETYPES, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) throw new Error("Lỗi fetch basetypes");

    const bases = await response.json();
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">-- Chọn Cốt sơn (Base) --</option>';
    bases.forEach((base) => {
      select.innerHTML += `<option value="${base.base_id}">${base.base_name}</option>`;
    });
  } catch (error) {
    console.error("Không thể tải danh sách BaseTypes:", error);
  }
}


// Tải danh sách Tỉnh/Thành phố an toàn
async function loadProvincesIntoSelect(selectId) {
  try {
    const response = await fetch(API_ROUTES.GEO_PROVINCES);
    if (!response.ok) {
      console.error(`[Lỗi địa lý] API Tỉnh trả về mã: ${response.status}`);
      return;
    }
    const provinces = await response.json();
    if (!Array.isArray(provinces)) return;
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Chọn Tỉnh/Thành phố --</option>';
    provinces.forEach((p) => {
      select.innerHTML += `<option value="${p.province_id}">${p.province_name}</option>`;
    });
  } catch (err) {
    console.error("Không thể kết nối đến API tỉnh thành:", err);
  }
}

// Tải danh sách Phường/Xã an toàn
async function loadWardsIntoSelect(provinceId, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (!provinceId) {
    select.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    return;
  }
  try {
    const response = await fetch(API_ROUTES.GEO_WARDS(provinceId));
    if (!response.ok) {
      console.error(`[Lỗi địa lý] API Xã trả về mã: ${response.status}`);
      return;
    }
    const wards = await response.json();
    if (!Array.isArray(wards)) return;
    select.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    wards.forEach((w) => {
      select.innerHTML += `<option value="${w.ward_id}">${w.ward_name}</option>`;
    });
  } catch (err) {
    console.error("Không thể kết nối đến API phường xã:", err);
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

async function loadEmployeesIntoSelect(selectId) {
  const token = getAdminToken();
  const response = await fetch(API_ROUTES.GET_EMPLOYEES, {
    headers: { Authorization: "Bearer " + token },
  });
  const employees = await response.json();
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- Chọn nhân viên --</option>';
  employees.forEach((emp) => {
    select.innerHTML += `<option value="${emp.employee_id}">${emp.full_name}</option>`;
  });
}

async function loadShiftsIntoSelect(selectId) {
  const token = getAdminToken();
  const response = await fetch(API_ROUTES.GET_SHIFTS, {
    headers: { Authorization: "Bearer " + token },
  });
  const shifts = await response.json();
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- Chọn ca làm --</option>';
  shifts.forEach((s) => {
    select.innerHTML += `<option value="${s.shift_id}">${s.shift_name} (${s.start_time}-${s.end_time})</option>`;
  });
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
    const stats = data.stats || {};
    const statusRows = data.status_breakdown || [];
    const lowBaseRows = data.low_base_stock || [];
    const lowColorantRows = data.low_colorants || [];
    const recentOrders = data.recent_orders || [];

    const statusHtml = statusRows.length
      ? statusRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.status)}</td>
            <td>${Number(row.count || 0)}</td>
            <td>${Number(row.total_amount || 0).toLocaleString("vi-VN")} đ</td>
          </tr>`).join("")
      : '<tr><td colspan="3">Chưa có dữ liệu trạng thái.</td></tr>';

    const lowBaseHtml = lowBaseRows.length
      ? lowBaseRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.brand_name)} - ${escapeHtml(row.line_name)}</td>
            <td>${escapeHtml(row.sku_code)}</td>
            <td>${escapeHtml(row.base_name)}</td>
            <td>${Number(row.stock_quantity || 0)}</td>
          </tr>`).join("")
      : '<tr><td colspan="4">Chưa có SKU sắp hết.</td></tr>';

    const lowColorantHtml = lowColorantRows.length
      ? lowColorantRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.colorant_name)}</td>
            <td>${Number(row.stock_ml || 0).toLocaleString("vi-VN")} ml</td>
            <td>${Number(row.unit_price_per_ml || 0).toLocaleString("vi-VN")} đ/ml</td>
          </tr>`).join("")
      : '<tr><td colspan="3">Chưa có tinh màu sắp hết.</td></tr>';

    const recentHtml = recentOrders.length
      ? recentOrders.map((row) => `
          <tr>
            <td>#${row.order_id}</td>
            <td>${escapeHtml(row.customer_name)}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${Number(row.total_amount || 0).toLocaleString("vi-VN")} đ</td>
            <td>${escapeHtml(row.created_at_text || "")}</td>
          </tr>`).join("")
      : '<tr><td colspan="5">Chưa có đơn hàng.</td></tr>';

    target.innerHTML = `
      <div class="admin-stats">
        <div class="stat-card">
          <strong>${Number(stats.total_orders || 0)}</strong>
          <span>Đơn hàng</span>
        </div>
        <div class="stat-card">
          <strong>${Number(stats.completed_revenue || 0).toLocaleString("vi-VN")} đ</strong>
          <span>Doanh thu hoàn tất</span>
        </div>
        <div class="stat-card">
          <strong>${Number(stats.pending_orders || 0)}</strong>
          <span>Đơn đang xử lý</span>
        </div>
        <div class="stat-card">
          <strong>${Number(stats.colorant_stock_ml || 0).toLocaleString("vi-VN")} ml</strong>
          <span>Tồn kho tinh màu</span>
        </div>
      </div>

      <div class="dashboard-grid">
        <section class="content-card">
          <h3>Trạng thái đơn hàng</h3>
          <table class="data-table">
            <thead><tr><th>Trạng thái</th><th>Số đơn</th><th>Giá trị</th></tr></thead>
            <tbody>${statusHtml}</tbody>
          </table>
        </section>

        <section class="content-card">
          <h3>Đơn mới gần đây</h3>
          <table class="data-table">
            <thead><tr><th>Mã</th><th>Khách</th><th>Trạng thái</th><th>Tổng</th><th>Ngày</th></tr></thead>
            <tbody>${recentHtml}</tbody>
          </table>
        </section>

        <section class="content-card">
          <h3>Cảnh báo sơn gốc sắp hết</h3>
          <table class="data-table">
            <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Base</th><th>Tồn</th></tr></thead>
            <tbody>${lowBaseHtml}</tbody>
          </table>
        </section>

        <section class="content-card">
          <h3>Cảnh báo tinh màu sắp hết</h3>
          <table class="data-table">
            <thead><tr><th>Tinh màu</th><th>Tồn</th><th>Đơn giá</th></tr></thead>
            <tbody>${lowColorantHtml}</tbody>
          </table>
        </section>
      </div>
    `;
  } catch (error) {
    console.error("Không thể tải dashboard:", error);
    target.innerHTML =
      '<div class="content-card">Không thể tải dữ liệu dashboard.</div>';
  }
}
