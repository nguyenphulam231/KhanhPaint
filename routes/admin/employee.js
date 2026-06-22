const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.employee_id, e.full_name, e.email, e.phone, e.hire_date, e.job_id, e.role, j.job_title
      FROM employees e
      LEFT JOIN jobs j ON e.job_id = j.job_id
      ORDER BY e.employee_id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách nhân viên: " + err.message });
  }
});

router.post("/add", async (req, res) => {
  const { full_name, email, phone, hire_date, password, job_id, role } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ họ tên, email và mật khẩu." });
  }

  try {
    const [existing] = await db.query("SELECT employee_id FROM employees WHERE email = ?", [email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email này đã được sử dụng bởi một nhân viên khác." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO employees (full_name, email, phone, hire_date, password_hash, job_id, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        email.trim(),
        phone ? phone.trim() : null,
        hire_date || null,
        hashedPassword,
        job_id ? Number(job_id) : null,
        role || "staff",
      ],
    );

    res.status(201).json({ message: "Thêm nhân viên thành công." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

router.put("/update/:id", async (req, res) => {
  const employeeId = req.params.id;
  const { full_name, email, phone, hire_date, password, job_id, role } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ error: "Không được bỏ trống họ tên và email." });
  }

  try {
    const [dupEmail] = await db.query(
      "SELECT employee_id FROM employees WHERE email = ? AND employee_id != ?",
      [email.trim(), employeeId],
    );
    if (dupEmail.length > 0) {
      return res.status(400).json({ error: "Email này đã được sử dụng bởi nhân viên khác." });
    }

    const params = [
      full_name.trim(),
      email.trim(),
      phone ? phone.trim() : null,
      hire_date || null,
      job_id ? Number(job_id) : null,
      role || "staff",
    ];

    let sql = `
      UPDATE employees
      SET full_name = ?, email = ?, phone = ?, hire_date = ?, job_id = ?, role = ?
      WHERE employee_id = ?
    `;

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql = `
        UPDATE employees
        SET full_name = ?, email = ?, phone = ?, hire_date = ?, job_id = ?, role = ?, password_hash = ?
        WHERE employee_id = ?
      `;
      params.push(hashedPassword, employeeId);
    } else {
      params.push(employeeId);
    }

    const [result] = await db.query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy nhân viên." });
    res.json({ message: "Cập nhật thông tin nhân viên thành công." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM employees WHERE employee_id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy nhân viên." });
    res.json({ message: "Đã xóa nhân viên thành công." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi hệ thống khi xóa: " + err.message });
  }
});

module.exports = router;
