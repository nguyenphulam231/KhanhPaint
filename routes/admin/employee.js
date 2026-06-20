const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");

const ALLOWED_ROLES = new Set(["admin", "staff"]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/add", async (req, res) => {
  const full_name = String(req.body.full_name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = String(req.body.phone || "").trim() || null;
  const hire_date = req.body.hire_date || null;
  const password = String(req.body.password || "");
  const job_id = req.body.job_id || null;
  const role = ALLOWED_ROLES.has(req.body.role) ? req.body.role : "staff";

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập họ tên, email và mật khẩu." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Email không hợp lệ." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO employees
       (full_name, email, phone, hire_date, password_hash, job_id, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone, hire_date, hashedPassword, job_id, role]
    );
    res.status(201).json({ message: "Thêm nhân viên thành công!" });
  } catch (err) {
    console.error("Create employee error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email nhân viên đã tồn tại." });
    }

    res.status(500).json({ error: "Lỗi thêm nhân viên." });
  }
});

module.exports = router;
