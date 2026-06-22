function getClientToken() {
  return localStorage.getItem("token");
}

function getClientType() {
  return localStorage.getItem("type");
}

function isCustomerLoggedIn() {
  return Boolean(getClientToken()) && getClientType() === "customer";
}

function requireCustomerLogin() {
  if (!isCustomerLoggedIn()) {
    window.location.href = "/client/login.html";
    return false;
  }
  return true;
}

function logoutCustomer() {
  clearAuthData();
  window.location.href = "/client/login.html";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN");
}

function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN");
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function badgeClass(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("hết") || text.includes("thiếu") || text.includes("quá") || text.includes("vượt") || text.includes("trễ")) return "badge danger";
  if (text.includes("sắp") || text.includes("nợ") || text.includes("pending") || text.includes("partial")) return "badge warning";
  return "badge success";
}

function showMessage(targetId, message, type = "info") {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `<div class="message-panel ${type}">${escapeHtml(message)}</div>`;
}

function renderClientHeader(activeNav = "home") {
  const name = localStorage.getItem("name") || "Khách hàng";
  const loggedIn = isCustomerLoggedIn();
  const nav = `
    <a class="${activeNav === "home" ? "active" : ""}" href="/client/">Trang chủ</a>
    <a class="${activeNav === "products" ? "active" : ""}" href="/client/products.html">Sản phẩm</a>
    ${loggedIn ? `<a class="${activeNav === "orders" ? "active" : ""}" href="/client/orders.html">Đơn hàng</a>` : ""}
    ${loggedIn ? `<a class="${activeNav === "profile" ? "active" : ""}" href="/client/profile.html">Hồ sơ & công nợ</a>` : ""}
  `;

  return `
    <header class="client-header">
      <div class="client-nav-wrap">
        <a class="brand-logo" href="/client/">KhanhPaint</a>
        <nav class="client-nav">${nav}</nav>
        <div class="client-auth-actions">
          ${loggedIn
            ? `<span>Xin chào, ${escapeHtml(name)}</span><button class="mini-btn" onclick="logoutCustomer()">Đăng xuất</button>`
            : `<a class="action-link compact" href="/client/login.html">Đăng nhập</a><a class="action-link compact" href="/client/register.html">Đăng ký</a>`}
        </div>
      </div>
    </header>`;
}

function mountClientHeader(activeNav) {
  const target = document.getElementById("clientHeader");
  if (target) target.innerHTML = renderClientHeader(activeNav);
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("client_cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("client_cart", JSON.stringify(cart));
}

function clearCart() {
  localStorage.removeItem("client_cart");
}
