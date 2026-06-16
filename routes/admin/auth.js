const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");

const SECRET_KEY = "your_secret_key_sieu_bi_mat";

// --- ĐĂNG NHẬP NHÂN VIÊN ---
router.post("/login", async (req, res) => {
  const { email, password, type } = req.body;

  if (!type || type !== "employee") {
    return res.status(400).json({ error: "Loại tài khoản không hợp lệ!" });
  }

  const table = "Employees";
  const idField = "employee_id";

  try {
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [
      email,
    ]);

    if (rows.length === 0)
      return res.status(401).json({ error: "Email không tồn tại!" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      const payload = {
        id: user[idField],
        email: user.email,
        role: user.role || "staff",
        type: type,
      };

      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });

      res.json({
        message: "Đăng nhập thành công!",
        token,
        role: payload.role,
        type: type,
      });
    } else {
      res.status(401).json({ error: "Sai mật khẩu!" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
