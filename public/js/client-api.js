// public/js/client-api.js
const CLIENT_API_ROUTES = {
  GET_PROVINCES: "/api/auth/public/provinces",
  GET_WARDS_BY_PROVINCE: (provinceId) => `/api/auth/public/wards/${provinceId}`,
  REGISTER: "/api/auth/public/register",
};
