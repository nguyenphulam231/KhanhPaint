// public/js/client-api.js
const CLIENT_API_ROUTES = {
  GET_PROVINCES: "/api/auth/public/provinces",
  GET_WARDS_BY_PROVINCE: (provinceId) => `/api/auth/public/wards/${provinceId}`,
  LOGIN: "/api/auth/public/login",
  REGISTER: "/api/auth/public/register",
  PRODUCTS: "/api/public/products",
  PRODUCT_FILTERS: "/api/public/products/filters",
  COLORS_BY_BASE: (baseId) => `/api/public/products/colors?base_id=${baseId}`,
  ORDERS: "/api/public/orders",
  ORDER_DETAIL: (orderId) => `/api/public/orders/${orderId}`,
};

function getCustomerToken() {
  return localStorage.getItem("customerToken");
}

function setCustomerToken(token) {
  localStorage.setItem("customerToken", token);
}

function clearCustomerToken() {
  localStorage.removeItem("customerToken");
}

function getCustomerAuthHeaders() {
  const token = getCustomerToken();
  return token ? { Authorization: "Bearer " + token } : {};
}
