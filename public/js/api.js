// public/js/api.js
const API_ROUTES = {
  DASHBOARD: "/api/admin/dashboard",

  // Jobs
  GET_JOBS: "/api/admin/jobs",
  ADD_JOB: "/api/admin/jobs/add",

  // Employees
  ADD_EMPLOYEE: "/api/admin/employees/add",

  // Products managed by admin
  GET_BRANDS: "/api/admin/brands",
  ADD_BRAND: "/api/admin/brands/add",
  GET_LINES_BY_BRAND: "/api/admin/lines/by-brand",
  ADD_LINE: "/api/admin/lines/add",
  ADD_BASETYPE: "/api/admin/base/add",
  GET_VARIANTS: "/api/admin/variants",
  ADD_VARIANT: "/api/admin/variants/add",
  UPDATE_VARIANT: "/api/admin/variants/update",
  DELETE_VARIANT: "/api/admin/variants/delete",
  GET_COLORANTS: "/api/admin/colorants",
  ADD_COLORANT: "/api/admin/colorants/add",
  GET_COLORSYSTEM: "/api/admin/colorsystem",
  ADD_COLORSYSTEM: "/api/admin/colorsystem/add",
  GET_SHIFTS: "/api/admin/shift",
  ADD_SHIFT: "/api/admin/shift/add",
  ASSIGN_SHIFT: "/api/admin/shift/assign",
  GET_EMPLOYEES: "/api/admin/employees",
};
