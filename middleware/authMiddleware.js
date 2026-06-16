// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_secret_key_sieu_bi_mat";

// Middleware kiểm tra đăng nhập (cái bạn đã có)
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(403).json({ error: "Bạn chưa đăng nhập!" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Token không hợp lệ!" });
    req.user = user;
    next();
  });
};

// Middleware kiểm tra quyền admin
const authorizeAdmin = (req, res, next) => {
  // Giả sử req.user đã được gán bởi middleware 'authenticate' phía trước
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ error: "Bạn không có quyền truy cập trang quản trị!" });
  }
};

module.exports = { authenticate, authorizeAdmin };
