const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");

const getSecret = () => process.env.JWT_SECRET || "dev_secret_change_me";

router.post("/login", async (req, res) => {
  const { email, password, type } = req.body;

  if (type !== "employee") {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ." });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
  }

  try {
    const [rows] = await db.query(
      `SELECT employee_id, full_name, email, password_hash, role FROM employees WHERE email = ?`,
      [email.trim()],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Email không tồn tại." });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash || "");
    if (!match) {
      return res.status(401).json({ error: "Sai mật khẩu." });
    }

    const payload = {
      id: user.employee_id,
      email: user.email,
      name: user.full_name,
      role: user.role || "staff",
      type: "employee",
    };

    const token = jwt.sign(payload, getSecret(), { expiresIn: "2h" });
    return res.json({ message: "Đăng nhập thành công!", token, role: payload.role, type: payload.type });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
