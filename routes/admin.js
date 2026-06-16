const express = require("express");
const router = express.Router();
const {
  authenticate,
  authorizeAdmin,
} = require("../middleware/authMiddleware");
const db = require("../db");

// Sử dụng cả 2 middleware nối tiếp nhau
router.get("/dashboard", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Truy vấn dữ liệu cho admin
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

// API lấy danh sách Jobs để đổ vào dropdown chọn Job
router.get("/jobs", async (req, res) => {
  const [jobs] = await db.query("SELECT * FROM Jobs");
  res.json(jobs);
});

// Thêm vị trí mới
router.post("/add-job", async (req, res) => {
  const { job_title, min_salary, max_salary } = req.body;
  await db.query(
    "INSERT INTO Jobs (job_title, min_salary, max_salary) VALUES (?, ?, ?)",
    [job_title, min_salary, max_salary],
  );
  res.status(201).json({ message: "Đã tạo vị trí mới!" });
});

async function createBrand() {
  const brandData = {
    name: document.getElementById("brandName").value,
    origin: document.getElementById("brandOrigin").value,
    description: document.getElementById("brandDesc").value,
  };

  const res = await fetch("/api/products/add-brand", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(brandData),
  });

  if (res.ok) {
    alert("Thêm thương hiệu thành công!");
    location.reload();
  } else {
    alert("Lỗi khi thêm thương hiệu!");
  }
}
module.exports = router;
