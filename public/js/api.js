// public/js/api.js
const API_ROUTES = {
  DASHBOARD: "/api/admin/dashboard",

  GET_JOBS: "/api/admin/jobs",
  ADD_JOB: "/api/admin/jobs/add",
  UPDATE_JOB: (id) => `/api/admin/jobs/update/${id}`,
  DELETE_JOB: (id) => `/api/admin/jobs/delete/${id}`,

  GET_EMPLOYEES: "/api/admin/employees",
  ADD_EMPLOYEE: "/api/admin/employees/add",
  UPDATE_EMPLOYEE: (id) => `/api/admin/employees/update/${id}`,
  DELETE_EMPLOYEE: (id) => `/api/admin/employees/delete/${id}`,

  GET_BRANDS: "/api/admin/brands",
  ADD_BRAND: "/api/admin/brands/add",
  UPDATE_BRAND: (id) => `/api/admin/brands/update/${id}`,
  DELETE_BRAND: (id) => `/api/admin/brands/delete/${id}`,

  GET_LINES: "/api/admin/lines",
  GET_LINES_BY_BRAND: "/api/admin/lines/by-brand",
  ADD_LINE: "/api/admin/lines/add",
  UPDATE_LINE: (id) => `/api/admin/lines/update/${id}`,
  DELETE_LINE: (id) => `/api/admin/lines/delete/${id}`,

  GET_BASETYPES: "/api/admin/base",
  ADD_BASETYPE: "/api/admin/base/add",
  UPDATE_BASETYPE: (id) => `/api/admin/base/update/${id}`,
  DELETE_BASETYPE: (id) => `/api/admin/base/delete/${id}`,

  GET_VARIANTS: "/api/admin/variants",
  ADD_VARIANT: "/api/admin/variants/add",
  UPDATE_VARIANT: (id) => `/api/admin/variants/update/${id}`,
  DELETE_VARIANT: (id) => `/api/admin/variants/delete/${id}`,

  GET_COLORANTS: "/api/admin/colorants",
  ADD_COLORANT: "/api/admin/colorants/add",
  UPDATE_COLORANT: (id) => `/api/admin/colorants/update/${id}`,
  DELETE_COLORANT: (id) => `/api/admin/colorants/delete/${id}`,

  GET_COLORSYSTEM: "/api/admin/colorsystem",
  ADD_COLORSYSTEM: "/api/admin/colorsystem/add",
  GET_FORMULA: (id) => `/api/admin/colorsystem/formula/${id}`,
  UPDATE_COLORSYSTEM: (id) => `/api/admin/colorsystem/update/${id}`,
  DELETE_COLORSYSTEM: (id) => `/api/admin/colorsystem/delete/${id}`,

  // Backward-compatible aliases for existing pages
  GET_COLORS: "/api/admin/colorsystem",
  ADD_COLOR: "/api/admin/colorsystem/add",
  UPDATE_COLOR: (id) => `/api/admin/colorsystem/update/${id}`,
  DELETE_COLOR: (id) => `/api/admin/colorsystem/delete/${id}`,

  GET_SHIFTS: "/api/admin/shift",
  ADD_SHIFT: "/api/admin/shift/add",
  UPDATE_SHIFT: (id) => `/api/admin/shift/update/${id}`,
  DELETE_SHIFT: (id) => `/api/admin/shift/delete/${id}`,
  ASSIGN_SHIFT: "/api/admin/shift/assign",

  GET_ORDERS: "/api/admin/orders",
  GET_ORDER_DETAIL: (id) => `/api/admin/orders/${id}`,
  UPDATE_ORDER_STATUS: (id) => `/api/admin/orders/${id}/status`,
  ASSIGN_ORDER: (id) => `/api/admin/orders/${id}/assign`,
  GET_ORDER_ASSIGNMENT_OPTIONS: "/api/admin/orders/assignment-options",
  ADD_ORDER_PAYMENT: (id) => `/api/admin/orders/${id}/payments`,
  GET_ORDER_PAYMENTS: (id) => `/api/admin/orders/${id}/payments`,

  GET_INVENTORY_MOVEMENTS: "/api/admin/inventory/movements",
  GET_LOW_STOCK: "/api/admin/inventory/low-stock",
};
