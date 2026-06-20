const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../../config/auth");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const type = req.body.type;

  if (type !== "employee") {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ!" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu!" });
  }

  try {
    const [rows] = await db.query(
      "SELECT employee_id, full_name, email, password_hash, role FROM employees WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0 || !rows[0].password_hash) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác!" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác!" });
    }

    const payload = {
      id: user.employee_id,
      email: user.email,
      role: user.role || "staff",
      type: "employee",
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: "Đăng nhập thành công!",
      token,
      role: payload.role,
      type: payload.type,
      full_name: user.full_name,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Lỗi hệ thống." });
  }
});

module.exports = router;
