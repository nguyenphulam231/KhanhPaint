const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");

const getSecret = () => process.env.JWT_SECRET || "dev_secret_change_me";

router.post("/login", async (req, res) => {
  const { email, password, type } = req.body;

  if (type !== "customer") {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ." });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
  }

  try {
    const [rows] = await db.query(
      `SELECT customer_id, name, email, password_hash FROM customers WHERE email = ?`,
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
      id: user.customer_id,
      email: user.email,
      name: user.name,
      role: "customer",
      type: "customer",
    };

    const token = jwt.sign(payload, getSecret(), { expiresIn: "2h" });
    return res.json({ message: "Đăng nhập thành công!", token, role: payload.role, type: payload.type });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

router.post("/register", async (req, res) => {
  const { name, phone, email, password, street_address, ward_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Vui lòng điền đầy đủ các thông tin bắt buộc: tên, email, mật khẩu.",
    });
  }

  try {
    const [existing] = await db.query("SELECT customer_id FROM customers WHERE email = ?", [email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email này đã được đăng ký." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO customers (name, phone, email, password_hash, street_address, ward_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        phone ? phone.trim() : null,
        email.trim(),
        password_hash,
        street_address ? street_address.trim() : null,
        ward_id ? Number(ward_id) : null,
      ],
    );

    return res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

router.get("/provinces", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT province_id, province_name FROM provinces ORDER BY province_name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

router.get("/wards/:provinceId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT ward_id, province_id, ward_name FROM wards WHERE province_id = ? ORDER BY ward_name",
      [req.params.provinceId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

module.exports = router;
