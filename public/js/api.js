// public/js/api.js
const API_ROUTES = {
  DASHBOARD: "/api/admin/dashboard",

  // Jobs
  GET_JOBS: "/api/admin/jobs",
  ADD_JOB: "/api/admin/jobs/add",

  // Employees
  ADD_EMPLOYEE: "/api/admin/employees/add",

  // Products (Brand, Line, BaseType)
  GET_BRANDS: "/api/products/brands",
  ADD_BRAND: "/api/products/add-brand",
  ADD_LINE: "/api/products/add-line",
  GET_LINES_BY_BRAND: "/api/products/lines-by-brand", // Gọi kèm id
  ADD_BASETYPE: "/api/products/add-basetype",
};
