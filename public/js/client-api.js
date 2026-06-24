// public/js/client-api.js
const CLIENT_API_ROUTES = {
  GET_PROVINCES: "/api/auth/public/provinces",
  GET_WARDS_BY_PROVINCE: (provinceId) => `/api/auth/public/wards/${provinceId}`,
  REGISTER: "/api/auth/public/register",
  LOGIN: "/api/auth/public/login",
  GET_PROFILE: "/api/client/profile/me",
  UPDATE_PROFILE: "/api/client/profile/me",

  // Các route cho sản phẩm & đơn hàng (Đã sửa lỗi dấu nháy)
  GET_PRODUCT_LINES: "/api/client/products/lines",
  GET_VARIANTS_BY_LINE: (lineId) =>
    `/api/client/products/lines/${lineId}/variants`,
  GET_COLOR_SYSTEM: "/api/client/products/colors",
  CREATE_ORDER: "/api/client/orders",
  GET_ORDER_HISTORY: "/api/client/orders/history",
};

// Hàm bổ trợ để tự động đính kèm Token JWT khi gọi các API cần đăng nhập
async function fetchWithAuth(url, options = {}) {
  const token =
    localStorage.getItem("client_token") || localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
