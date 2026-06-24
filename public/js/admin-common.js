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
      <a class="menu-item ${activeNav === "colorants" ? "active" : ""}" data-admin-nav="colorants" href="/admin/colorant-manage.html">Quản lý Tinh màu</a>
      <a class="menu-item ${activeNav === "colorsystem" ? "active" : ""}" data-admin-nav="colorsystem" href="/admin/colorsystem-manage.html">Quản lý Mã màu</a>
      <a class="menu-item ${activeNav === "shifts" ? "active" : ""}" data-admin-nav="shifts" href="/admin/shift-manage.html">Quản lý Ca làm</a>
      <a class="menu-item ${activeNav === "assign-shift" ? "active" : ""}" data-admin-nav="assign-shift" href="/admin/shift-assign.html">Phân ca làm việc</a>
      <a class="menu-item ${activeNav === "customers" ? "active" : ""}" data-admin-nav="customers" href="/admin/customer-manage.html">Quản lý Khách hàng</a>
      <a class="menu-item ${activeNav === "create-order" ? "active" : ""}" data-admin-nav="create-order" href="/admin/order-create.html">Tạo đơn hàng mới</a>
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
      console.error(
        `[Lỗi địa lý] API Tỉnh trả về mã: ${response.status} từ đường dẫn: ${API_ROUTES.GEO_PROVINCES}`,
      );
      return;
    }

    const provinces = await response.json();

    if (!Array.isArray(provinces)) {
      console.error(
        "[Lỗi địa lý] Dữ liệu tỉnh thành trả về không phải dạng mảng:",
        provinces,
      );
      return;
    }

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
      console.error(
        `[Lỗi địa lý] API Xã trả về mã: ${response.status} cho Tỉnh ID: ${provinceId}`,
      );
      return;
    }

    const wards = await response.json();

    if (!Array.isArray(wards)) {
      console.error(
        "[Lỗi địa lý] Dữ liệu phường xã trả về không phải dạng mảng:",
        wards,
      );
      return;
    }

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
