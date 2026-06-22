const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");

const SECRET_KEY = "your_secret_key_sieu_bi_mat";

// --- MIDDLEWARE: Xác thực quyền Admin ---
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

// --- 1. API: Lấy danh sách nhân viên (CẢI TIẾN JOIN BẢNG JOBS) ---
router.get("/", verifyAdmin, async (req, res) => {
  try {
    // JOIN để lấy thêm job_title hiển thị ra bảng dữ liệu công khai
    const [rows] = await db.query(`
      SELECT e.employee_id, e.full_name, e.email, e.phone, e.hire_date, e.job_id, e.role, j.job_title 
      FROM employees e
      LEFT JOIN Jobs j ON e.job_id = j.job_id
      ORDER BY e.employee_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách nhân viên:", err);
    res.status(500).json({ error: "Không thể lấy danh sách nhân viên." });
  }
});

// --- 2. API: Thêm nhân viên mới (Giữ nguyên) ---
router.post("/add", verifyAdmin, async (req, res) => {
  const { full_name, email, phone, hire_date, password, job_id, role } =
    req.body;

  if (!full_name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!" });
  }

  try {
    const [existing] = await db.query(
      "SELECT * FROM employees WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Email này đã được sử dụng bởi một nhân viên khác!" });
    }

    const finalJobId = job_id && job_id.trim() !== "" ? parseInt(job_id) : null;
    const finalHireDate =
      hire_date && hire_date.trim() !== "" ? hire_date : null;
    const finalPhone = phone && phone.trim() !== "" ? phone : null;
    const finalRole = role || "staff";
    const hashedPassword = await bcrypt.hash(password, 10);

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

// --- 3. API: SỬA THÔNG TIN NHÂN VIÊN (MỚI) ---
router.put("/update/:id", verifyAdmin, async (req, res) => {
  const employeeId = req.params.id;
  const { full_name, email, phone, hire_date, password, job_id, role } =
    req.body;

  if (!full_name || !email) {
    return res
      .status(400)
      .json({ error: "Không được bỏ trống Họ tên và Email!" });
  }

  try {
    // Kiểm tra trùng email với người khác
    const [dupEmail] = await db.query(
      "SELECT * FROM employees WHERE email = ? AND employee_id != ?",
      [email, employeeId],
    );
    if (dupEmail.length > 0) {
      return res
        .status(400)
        .json({ error: "Email này đã được sử dụng bởi nhân viên khác!" });
    }

    const finalJobId = job_id && job_id.trim() !== "" ? parseInt(job_id) : null;
    const finalHireDate =
      hire_date && hire_date.trim() !== "" ? hire_date : null;
    const finalPhone = phone && phone.trim() !== "" ? phone : null;

    if (password && password.trim() !== "") {
      // Nếu quản trị viên có nhập mật khẩu mới -> cập nhật cả pass
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE employees SET full_name = ?, email = ?, phone = ?, hire_date = ?, password_hash = ?, job_id = ?, role = ? WHERE employee_id = ?",
        [
          full_name,
          email,
          finalPhone,
          finalHireDate,
          hashedPassword,
          finalJobId,
          role,
          employeeId,
        ],
      );
    } else {
      // Không nhập mật khẩu mới -> giữ nguyên pass cũ
      await db.query(
        "UPDATE employees SET full_name = ?, email = ?, phone = ?, hire_date = ?, job_id = ?, role = ? WHERE employee_id = ?",
        [
          full_name,
          email,
          finalPhone,
          finalHireDate,
          finalJobId,
          role,
          employeeId,
        ],
      );
    }

    res.json({ message: "Cập nhật thông tin nhân viên thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

// --- 4. API: XÓA NHÂN VIÊN (MỚI) ---
router.delete("/delete/:id", verifyAdmin, async (req, res) => {
  const employeeId = req.params.id;
  try {
    await db.query("DELETE FROM employees WHERE employee_id = ?", [employeeId]);
    res.json({ message: "Đã xóa nhân viên thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống khi xóa: " + err.message });
  }
});

module.exports = router;
