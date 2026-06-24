// routes/admin/customer.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");

// 1. LẤY DANH SÁCH KHÁCH HÀNG (Có bộ lọc nâng cao)
router.get("/", async (req, res) => {
  const { keyword, province_id } = req.query;

  let conditions = [];
  let params = [];

  // Lọc theo từ khóa (Tên, Email, Số điện thoại)
  if (keyword) {
    conditions.push("(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  // Lọc theo Tỉnh/Thành phố
  if (province_id) {
    conditions.push("w.province_id = ?");
    params.push(province_id);
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const query = `
      SELECT c.*, w.ward_name, p.province_name, p.province_id
      FROM customers c
      LEFT JOIN wards w ON c.ward_id = w.ward_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      ${whereClause}
      ORDER BY c.customer_id DESC
    `;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

// 2. THÊM KHÁCH HÀNG MỚI
router.post("/add", async (req, res) => {
  const { name, phone, email, password, street_address, ward_id } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Vui lòng điền đầy đủ Tên, Email và Mật khẩu!" });
  }

  try {
    // Kiểm tra trùng email
    const [existing] = await db.query(
      "SELECT * FROM customers WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email này đã được sử dụng!" });
    }

    // Băm mật khẩu bằng bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO customers (name, phone, email, password_hash, street_address, ward_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      name,
      phone || null,
      email,
      password_hash,
      street_address || null,
      ward_id ? parseInt(ward_id) : null,
    ];

    const [insertResult] = await db.query(query, params);
    res.status(201).json({
      success: true,
      customer_id: insertResult.insertId,
      message: "Thêm khách hàng thành công!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi: " + err.message });
  }
});

// 3. CẬP NHẬT THÔNG TIN KHÁCH HÀNG
router.put("/update/:id", async (req, res) => {
  const customerId = req.params.id;
  const { name, phone, email, password, street_address, ward_id } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Tên và Email không được để trống!" });
  }

  try {
    // Kiểm tra trùng email với tài khoản khác
    const [existing] = await db.query(
      "SELECT * FROM customers WHERE email = ? AND customer_id != ?",
      [email, customerId],
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Email này đã được một khách hàng khác sử dụng!" });
    }

    let query = "";
    let params = [];

    if (password && password.trim() !== "") {
      // Nếu quản trị viên nhập mật khẩu mới -> cập nhật cả password_hash
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      query = `
        UPDATE customers 
        SET name = ?, phone = ?, email = ?, password_hash = ?, street_address = ?, ward_id = ?
        WHERE customer_id = ?
      `;
      params = [
        name,
        phone || null,
        email,
        password_hash,
        street_address || null,
        ward_id ? parseInt(ward_id) : null,
        customerId,
      ];
    } else {
      // Nếu không nhập mật khẩu -> Giữ nguyên mật khẩu cũ
      query = `
        UPDATE customers 
        SET name = ?, phone = ?, email = ?, street_address = ?, ward_id = ?
        WHERE customer_id = ?
      `;
      params = [
        name,
        phone || null,
        email,
        street_address || null,
        ward_id ? parseInt(ward_id) : null,
        customerId,
      ];
    }

    const [result] = await db.query(query, params);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy khách hàng để cập nhật!" });
    }

    res.json({ message: "Cập nhật thông tin khách hàng thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

// 4. XÓA KHÁCH HÀNG
router.delete("/delete/:id", async (req, res) => {
  const customerId = req.params.id;
  try {
    const [result] = await db.query(
      "DELETE FROM customers WHERE customer_id = ?",
      [customerId],
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy khách hàng để xóa!" });
    }
    res.json({ message: "Đã xóa khách hàng thành công!" });
  } catch (err) {
    res.status(500).json({
      error:
        "Không thể xóa khách hàng này vì tài khoản đã có dữ liệu đơn hàng hoặc lịch sử liên kết hệ thống!",
    });
  }
});

// 5. LẤY LỊCH SỬ ĐƠN HÀNG CHI TIẾT CỦA 1 KHÁCH HÀNG  ← THÊM TỪ ĐÂY
router.get("/:id/orders", async (req, res) => {
  const customerId = req.params.id;

  try {
    const [orders] = await db.query(
      `
      SELECT
        o.order_id,
        o.total_amount,
        o.status,
        o.street_address,
        o.created_at,
        w.ward_name,
        p.province_name,
        sales.full_name AS sales_rep_name,
        tech.full_name  AS tech_name,
        s.shift_name
      FROM orders o
      LEFT JOIN wards w ON o.ward_id = w.ward_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
      LEFT JOIN employees tech ON o.tech_id = tech.employee_id
      LEFT JOIN shifts s ON o.shift_id = s.shift_id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      `,
      [customerId],
    );

    if (orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map((o) => o.order_id);
    const [details] = await db.query(
      `
      SELECT
        od.order_id,
        od.quantity,
        od.price_at_sale,
        cs.color_code,
        cs.color_name,
        bt.base_name,
        pv.sku_code,
        pv.volume,
        pl.name AS line_name,
        br.name AS brand_name
      FROM orderdetails od
      JOIN colorsystem cs ON od.color_id = cs.color_id
      JOIN basetypes bt ON cs.base_id = bt.base_id
      JOIN productvariants pv ON od.variant_id = pv.variant_id
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN brands br ON pl.brand_id = br.brand_id
      WHERE od.order_id IN (?)
      ORDER BY od.order_id DESC
      `,
      [orderIds],
    );

    const detailsByOrder = {};
    details.forEach((d) => {
      if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
      detailsByOrder[d.order_id].push(d);
    });

    const result = orders.map((o) => ({
      ...o,
      items: detailsByOrder[o.order_id] || [],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Lỗi: " + err.message });
  }
});

module.exports = router;
