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

module.exports = router;
