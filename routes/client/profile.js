const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key_sieu_bi_mat";

function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Bạn cần đăng nhập để thực hiện thao tác này!",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    if (!payload.id) {
      return res
        .status(401)
        .json({ success: false, error: "Token không hợp lệ!" });
    }
    req.customerId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Token hết hạn hoặc không hợp lệ!",
    });
  }
}

router.use(requireCustomerAuth);

async function loadProfile(customerId) {
  const [rows] = await db.execute(
    `SELECT
       c.customer_id,
       c.name,
       c.email,
       c.phone,
       c.street_address,
       c.ward_id,
       c.credit_limit,
       c.current_debt,
       w.ward_name,
       p.province_id,
       p.province_name
     FROM customers c
     LEFT JOIN wards w ON c.ward_id = w.ward_id
     LEFT JOIN provinces p ON w.province_id = p.province_id
     WHERE c.customer_id = ?`,
    [customerId],
  );

  return rows[0] || null;
}

router.get("/me", async (req, res) => {
  try {
    const profile = await loadProfile(req.customerId);
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy hồ sơ khách hàng!" });
    }
    res.json({ success: true, customer: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/me", async (req, res) => {
  const { name, phone, email, street_address, ward_id, password } = req.body;

  if (!name || !name.trim() || !email || !email.trim()) {
    return res.status(400).json({
      success: false,
      error: "Tên và Email không được để trống!",
    });
  }

  try {
    const [existing] = await db.execute(
      "SELECT customer_id FROM customers WHERE email = ? AND customer_id != ?",
      [email.trim(), req.customerId],
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Email này đã được sử dụng bởi tài khoản khác!",
        });
    }

    const params = [
      name.trim(),
      phone && phone.trim() ? phone.trim() : null,
      email.trim(),
      street_address && street_address.trim() ? street_address.trim() : null,
      ward_id ? parseInt(ward_id, 10) : null,
      req.customerId,
    ];

    let query = `
      UPDATE customers
      SET name = ?, phone = ?, email = ?, street_address = ?, ward_id = ?
      WHERE customer_id = ?
    `;

    if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      query = `
        UPDATE customers
        SET name = ?, phone = ?, email = ?, street_address = ?, ward_id = ?, password_hash = ?
        WHERE customer_id = ?
      `;
      params.splice(5, 0, passwordHash);
    }

    const [result] = await db.execute(query, params);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: "Không tìm thấy khách hàng để cập nhật!",
        });
    }

    const customer = await loadProfile(req.customerId);
    res.json({
      success: true,
      message: "Cập nhật hồ sơ thành công!",
      customer,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
