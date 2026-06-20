const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/auth");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Bạn chưa đăng nhập!" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn!" });
    }

    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.type === "employee" && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({ error: "Bạn không có quyền truy cập trang quản trị!" });
};

module.exports = { authenticate, authorizeAdmin };
