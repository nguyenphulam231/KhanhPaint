const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../../config/auth");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const type = req.body.type;

  if (type !== "customer") {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ!" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu!" });
  }

  try {
    const [rows] = await db.query(
      "SELECT customer_id, name, email, password_hash, role FROM customers WHERE email = ? LIMIT 1",
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
      id: user.customer_id,
      email: user.email,
      role: user.role || "customer",
      type: "customer",
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: "Đăng nhập thành công!",
      token,
      role: payload.role,
      type: payload.type,
      name: user.name,
    });
  } catch (err) {
    console.error("Customer login error:", err);
    res.status(500).json({ error: "Lỗi hệ thống." });
  }
});

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const address = String(req.body.address || "").trim();

  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin!" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Email không hợp lệ!" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự!" });
  }

  try {
    const [existing] = await db.query(
      "SELECT customer_id FROM customers WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email này đã được đăng ký!" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO customers (name, phone, email, password_hash, role, address) VALUES (?, ?, ?, ?, 'customer', ?)",
      [name, phone, email, password_hash, address || null]
    );

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error("Customer register error:", err);
    res.status(500).json({ error: "Lỗi hệ thống." });
  }
});

module.exports = router;
