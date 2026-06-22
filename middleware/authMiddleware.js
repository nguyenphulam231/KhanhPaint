const jwt = require("jsonwebtoken");

const getSecret = () => process.env.JWT_SECRET || "dev_secret_change_me";

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

const authenticate = (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Bạn chưa đăng nhập." });
  }

  try {
    req.user = jwt.verify(token, getSecret());
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.type === "employee" && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Bạn không có quyền truy cập trang quản trị." });
};

const authorizeCustomer = (req, res, next) => {
  if (req.user && req.user.type === "customer") {
    return next();
  }
  return res.status(403).json({ error: "Tài khoản khách hàng không hợp lệ." });
};

module.exports = { authenticate, authorizeAdmin, authorizeCustomer };
