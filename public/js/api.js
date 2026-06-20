const API_ROUTES = {
  ADMIN_LOGIN: "/api/auth/admin/login",
  CUSTOMER_LOGIN: "/api/auth/public/login",
  CUSTOMER_REGISTER: "/api/auth/public/register",

  DASHBOARD: "/api/admin/dashboard",

  GET_JOBS: "/api/admin/jobs",
  ADD_JOB: "/api/admin/jobs/add",

  ADD_EMPLOYEE: "/api/admin/employees/add",

  GET_PRODUCTS: "/api/admin/products",
  GET_BRANDS: "/api/admin/products/brands",
  ADD_BRAND: "/api/admin/products/add-brand",
  GET_LINES: "/api/admin/products/lines",
  ADD_LINE: "/api/admin/products/add-line",
  GET_LINES_BY_BRAND: "/api/admin/products/lines-by-brand",
  GET_BASETYPES: "/api/admin/products/basetypes",
  GET_BASETYPES_BY_LINE: "/api/admin/products/basetypes-by-line",
  ADD_BASETYPE: "/api/admin/products/add-basetype",
  GET_VARIANTS: "/api/admin/products/variants",
  ADD_VARIANT: "/api/admin/products/add-variant",
  DELETE_VARIANT: "/api/admin/products/delete-variant",
};

function getToken() {
  return localStorage.getItem("token");
}

function saveAuthData(data) {
  if (data.token) localStorage.setItem("token", data.token);
  if (data.role) localStorage.setItem("role", data.role);
  if (data.type) localStorage.setItem("type", data.type);
  if (data.full_name) localStorage.setItem("full_name", data.full_name);
  if (data.name) localStorage.setItem("name", data.name);
}

function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("type");
  localStorage.removeItem("full_name");
  localStorage.removeItem("name");
}

function getAuthHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function parseJsonResponse(response) {
  return response.json().catch(() => ({}));
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.message || "Có lỗi xảy ra khi gọi API.");
  }

  return data;
}

async function publicRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.message || "Có lỗi xảy ra khi gọi API.");
  }

  return data;
}
