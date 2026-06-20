// public/js/api.js

const API_ROUTES = {
  // Auth
  ADMIN_LOGIN: "/api/auth/admin/login",
  CUSTOMER_LOGIN: "/api/auth/public/login",
  CUSTOMER_REGISTER: "/api/auth/public/register",

  // Admin dashboard
  DASHBOARD: "/api/admin/dashboard",

  // Jobs
  GET_JOBS: "/api/admin/jobs",
  ADD_JOB: "/api/admin/jobs/add",

  // Employees
  ADD_EMPLOYEE: "/api/admin/employees/add",

  // Products
  GET_PRODUCTS: "/api/admin/products",
  GET_BRANDS: "/api/admin/products/brands",
  ADD_BRAND: "/api/admin/products/add-brand",
  ADD_LINE: "/api/admin/products/add-line",
  GET_LINES: "/api/admin/products/lines",
  GET_LINES_BY_BRAND: "/api/admin/products/lines-by-brand",
  ADD_BASETYPE: "/api/admin/products/add-basetype",
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

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Có lỗi xảy ra khi gọi API.");
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Có lỗi xảy ra khi gọi API.");
  }

  return data;
}