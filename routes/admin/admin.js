const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const {
  authenticate,
  authorizeAdmin,
} = require("../../middleware/authMiddleware");
const db = require("../../db");

// Áp dụng middleware cho tất cả các route bên dưới
router.use(authenticate, authorizeAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const [orders] = await db.query("SELECT * FROM Orders");
    res.json({ message: "Chào mừng Admin", data: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/add-employee", async (req, res) => {
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

router.get("/jobs", async (req, res) => {
  const [jobs] = await db.query("SELECT * FROM Jobs");
  res.json(jobs);
});

router.post("/add-job", async (req, res) => {
  const { job_title, min_salary, max_salary } = req.body;
  await db.query(
    "INSERT INTO Jobs (job_title, min_salary, max_salary) VALUES (?, ?, ?)",
    [job_title, min_salary, max_salary],
  );
  res.status(201).json({ message: "Đã tạo vị trí mới!" });
});

module.exports = router;
