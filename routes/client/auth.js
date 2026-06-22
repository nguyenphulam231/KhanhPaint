const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");

// Khuyến khích sau này đổi thành: const SECRET_KEY = process.env.JWT_SECRET;
const SECRET_KEY = "your_secret_key_sieu_bi_mat";

// --- ĐĂNG NHẬP KHÁCH HÀNG ---
router.post("/login", async (req, res) => {
  const { email, password, type } = req.body;

  if (!type || type !== "customer") {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ!" });
  }

  const table = "customers";
  const idField = "customer_id";

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
        role: "customer",
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
    // Đồng bộ style báo lỗi dạng "Lỗi: " giống employee.js
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

// --- ĐĂNG KÝ (Dành riêng cho Khách hàng) ---
router.post("/register", async (req, res) => {
  const { name, phone, email, password, street_address, ward_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error:
        "Vui lòng điền đầy đủ các thông tin bắt buộc (Tên, Email, Mật khẩu)!",
    });
  }

  try {
    const [existing] = await db.query(
      "SELECT * FROM customers WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email này đã được đăng ký!" });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const finalWardId = ward_id ? parseInt(ward_id) : null;
    const finalStreetAddress = street_address || null;
    const finalPhone = phone || null;

    await db.query(
      "INSERT INTO customers (name, phone, email, password_hash, street_address, ward_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, finalPhone, email, password_hash, finalStreetAddress, finalWardId],
    );

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    // Đồng bộ style báo lỗi dạng "Lỗi: " giống employee.js
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

// --- API BỔ TRỢ: Địa lý ---
router.get("/provinces", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM provinces ORDER BY province_name",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

router.get("/wards/:provinceId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM wards WHERE province_id = ? ORDER BY ward_name",
      [req.params.provinceId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

module.exports = router;
