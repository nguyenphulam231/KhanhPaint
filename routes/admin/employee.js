const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");

router.post("/add", async (req, res) => {
  const { full_name, email, phone, hire_date, password, job_id, role } =
    req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Employees (full_name, email, phone, hire_date, password_hash, job_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [full_name, email, phone, hire_date, hashedPassword, job_id, role],
    );
    res.status(201).json({ message: "Thêm nhân viên thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    // Chỉ lấy những cột cần thiết để đổ vào select
    const [rows] = await db.query(
      "SELECT employee_id, full_name FROM Employees",
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách nhân viên:", err);
    res.status(500).json({ error: "Không thể lấy danh sách nhân viên." });
  }
});

module.exports = router;
