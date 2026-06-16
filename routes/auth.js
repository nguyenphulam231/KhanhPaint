const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const SECRET_KEY = "your_secret_key_sieu_bi_mat";

// --- ĐĂNG NHẬP (Dùng cho cả Khách hàng và Nhân viên) ---
router.post("/login", async (req, res) => {
  const { email, password, type } = req.body;

  if (!type || (type !== "employee" && type !== "customer")) {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ!" });
  }

  const table = type === "employee" ? "Employees" : "Customers";
  const idField = type === "employee" ? "employee_id" : "customer_id";

  try {
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [
      email,
    ]);

    if (rows.length === 0)
      return res.status(401).json({ error: "Email không tồn tại!" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      const payload = {
        id: user[idField],
        email: user.email,
        role: user.role || (type === "employee" ? "staff" : "customer"),
        type: type,
      };

      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });

      res.json({
        message: "Đăng nhập thành công!",
        token,
        role: payload.role,
        type: type,
      });
    } else {
      res.status(401).json({ error: "Sai mật khẩu!" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ĐĂNG KÝ (Dành riêng cho Khách hàng) ---
router.post("/register", async (req, res) => {
  const { name, phone, email, password } = req.body;

  try {
    // 1. Kiểm tra email tồn tại
    const [existing] = await db.query(
      "SELECT * FROM Customers WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email này đã được đăng ký!" });
    }

    // 2. Hash mật khẩu
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 3. Lưu vào database
    await db.query(
      "INSERT INTO Customers (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, 'customer')",
      [name, phone, email, password_hash],
    );

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

module.exports = router;
