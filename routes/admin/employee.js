const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // Thêm jwt để xác thực token
const db = require("../../db");

const SECRET_KEY = "your_secret_key_sieu_bi_mat"; // Nên đồng bộ hoặc import từ file cấu hình chung

// --- MIDDLEWARE: Xác thực quyền Admin ---
// Giúp chặn các truy cập trái phép từ bên ngoài backend
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ error: "Truy cập bị từ chối! Không tìm thấy token." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // Kiểm tra xem type có phải là employee và role có phải admin hay không
    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền thực hiện hành động này!" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ error: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

// --- API: Thêm nhân viên mới (Đã thêm middleware bảo mật verifyAdmin) ---
router.post("/add", verifyAdmin, async (req, res) => {
  const { full_name, email, phone, hire_date, password, job_id, role } =
    req.body;

  // Kiểm tra các trường bắt buộc
  if (!full_name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!" });
  }

  try {
    // 1. Kiểm tra email nhân viên đã tồn tại chưa
    const [existing] = await db.query(
      "SELECT * FROM employees WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Email này đã được sử dụng bởi một nhân viên khác!" });
    }

    // 2. Chuẩn hóa dữ liệu tránh lỗi ngoại khóa và ép kiểu của MySQL
    const finalJobId = job_id && job_id.trim() !== "" ? parseInt(job_id) : null;
    const finalHireDate =
      hire_date && hire_date.trim() !== "" ? hire_date : null;
    const finalPhone = phone && phone.trim() !== "" ? phone : null;
    const finalRole = role || "staff";

    // 3. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Thực hiện Insert (Đổi 'Employees' thành 'employees')
    await db.query(
      "INSERT INTO employees (full_name, email, phone, hire_date, password_hash, job_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        full_name,
        email,
        finalPhone,
        finalHireDate,
        hashedPassword,
        finalJobId,
        finalRole,
      ],
    );

    res.status(201).json({ message: "Thêm nhân viên thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

// --- API: Lấy danh sách nhân viên để đổ vào dropdown select ---
router.get("/", async (req, res) => {
  try {
    // Đổi 'Employees' thành 'employees' để khớp schema
    const [rows] = await db.query(
      "SELECT employee_id, full_name FROM employees ORDER BY full_name",
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách nhân viên:", err);
    res.status(500).json({ error: "Không thể lấy danh sách nhân viên." });
  }
});

module.exports = router;
