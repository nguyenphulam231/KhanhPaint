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

  GET_INVENTORY_PRODUCTS: "/api/admin/lookup/inventory/products",
  GET_INVENTORY_COLORANTS: "/api/admin/lookup/inventory/colorants",
  GET_COLORS: "/api/admin/lookup/colors",
  GET_COLOR_FORMULA: "/api/admin/lookup/colors",
  SEARCH_FORMULA: "/api/admin/lookup/formulas",
  GET_CUSTOMERS: "/api/admin/lookup/customers",
  GET_CUSTOMER_DEBT: "/api/admin/lookup/customers/debt",
  GET_CUSTOMER_ORDERS: "/api/admin/lookup/customers",
  GET_ORDERS: "/api/admin/lookup/orders",
  GET_ORDER_DETAIL: "/api/admin/orders",
  GET_ORDER_OPTIONS: "/api/admin/orders/options",
  CREATE_ORDER: "/api/admin/orders",
  GET_REVENUE_REPORT: "/api/admin/lookup/reports/revenue",
  GET_TOP_PRODUCTS: "/api/admin/lookup/reports/top-products",
  GET_TOP_COLORS: "/api/admin/lookup/reports/top-colors",
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
