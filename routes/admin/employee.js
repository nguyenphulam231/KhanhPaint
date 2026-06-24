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

// --- 1. API: Lấy danh sách nhân viên ---
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.employee_id, e.full_name, e.email, e.phone, e.hire_date, e.job_id, e.salary, e.role, j.job_title 
      FROM employees e
      LEFT JOIN jobs j ON e.job_id = j.job_id
      ORDER BY e.employee_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách nhân viên:", err);
    res.status(500).json({ error: "Không thể lấy danh sách nhân viên." });
  }
});

// --- 2. API: Thêm nhân viên mới (CÓ KIỂM TRA KHOẢNG LƯƠNG) ---
router.post("/add", verifyAdmin, async (req, res) => {
  const { full_name, email, phone, hire_date, password, job_id, salary, role } =
    req.body;

  if (!full_name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!" });
  }

  try {
    // 2.1. Kiểm tra trùng Email
    const [existing] = await db.query(
      "SELECT * FROM employees WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email này đã được sử dụng!" });
    }

    const finalJobId = job_id && job_id.trim() !== "" ? parseInt(job_id) : null;
    const finalSalary =
      salary !== undefined && salary !== null && salary !== ""
        ? parseFloat(salary)
        : null;

    // 2.2. BỔ SUNG: Kiểm tra khống chế min/max salary của Job
    if (finalJobId && finalSalary !== null) {
      const [jobs] = await db.query(
        "SELECT job_title, min_salary, max_salary FROM jobs WHERE job_id = ?",
        [finalJobId],
      );
      if (jobs.length > 0) {
        const job = jobs[0];
        if (
          job.min_salary !== null &&
          finalSalary < parseFloat(job.min_salary)
        ) {
          return res.status(400).json({
            error: `Lương không được thấp hơn mức tối thiểu của vị trí [${job.job_title}] (${Number(job.min_salary).toLocaleString("vi-VN")} đ)`,
          });
        }
        if (
          job.max_salary !== null &&
          finalSalary > parseFloat(job.max_salary)
        ) {
          return res.status(400).json({
            error: `Lương không được vượt quá mức tối đa của vị trí [${job.job_title}] (${Number(job.max_salary).toLocaleString("vi-VN")} đ)`,
          });
        }
      }
    }

    const finalHireDate =
      hire_date && hire_date.trim() !== "" ? hire_date : null;
    const finalPhone = phone && phone.trim() !== "" ? phone : null;
    const finalRole = role || "staff";
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO employees (full_name, email, phone, hire_date, password_hash, job_id, salary, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        full_name,
        email,
        finalPhone,
        finalHireDate,
        hashedPassword,
        finalJobId,
        finalSalary,
        finalRole,
      ],
    );

    res.status(201).json({ message: "Thêm nhân viên thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

// --- 3. API: SỬA THÔNG TIN NHÂN VIÊN (CÓ KIỂM TRA KHOẢNG LƯƠNG) ---
router.put("/update/:id", verifyAdmin, async (req, res) => {
  const employeeId = req.params.id;
  const { full_name, email, phone, hire_date, password, job_id, salary, role } =
    req.body;

  if (!full_name || !email) {
    return res
      .status(400)
      .json({ error: "Không được bỏ trống Họ tên và Email!" });
  }

  try {
    // 3.1. Kiểm tra trùng email với người khác
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
    const finalSalary =
      salary !== undefined && salary !== null && salary !== ""
        ? parseFloat(salary)
        : null;

    // 3.2. BỔ SUNG: Kiểm tra khống chế min/max salary của Job khi sửa
    if (finalJobId && finalSalary !== null) {
      const [jobs] = await db.query(
        "SELECT job_title, min_salary, max_salary FROM jobs WHERE job_id = ?",
        [finalJobId],
      );
      if (jobs.length > 0) {
        const job = jobs[0];
        if (
          job.min_salary !== null &&
          finalSalary < parseFloat(job.min_salary)
        ) {
          return res.status(400).json({
            error: `Lương sửa đổi thấp hơn mức tối thiểu của vị trí [${job.job_title}] (${Number(job.min_salary).toLocaleString("vi-VN")} đ)`,
          });
        }
        if (
          job.max_salary !== null &&
          finalSalary > parseFloat(job.max_salary)
        ) {
          return res.status(400).json({
            error: `Lương sửa đổi vượt quá mức tối đa của vị trí [${job.job_title}] (${Number(job.max_salary).toLocaleString("vi-VN")} đ)`,
          });
        }
      }
    }

    const finalHireDate =
      hire_date && hire_date.trim() !== "" ? hire_date : null;
    const finalPhone = phone && phone.trim() !== "" ? phone : null;

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE employees SET full_name = ?, email = ?, phone = ?, hire_date = ?, password_hash = ?, job_id = ?, salary = ?, role = ? WHERE employee_id = ?",
        [
          full_name,
          email,
          finalPhone,
          finalHireDate,
          hashedPassword,
          finalJobId,
          finalSalary,
          role,
          employeeId,
        ],
      );
    } else {
      await db.query(
        "UPDATE employees SET full_name = ?, email = ?, phone = ?, hire_date = ?, job_id = ?, salary = ?, role = ? WHERE employee_id = ?",
        [
          full_name,
          email,
          finalPhone,
          finalHireDate,
          finalJobId,
          finalSalary,
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

// --- 4. API: XÓA NHÂN VIÊN ---
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
