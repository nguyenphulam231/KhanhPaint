const express = require("express");
const router = express.Router();
const db = require("../../db");

const ALLOWED_STATUS = ["pending", "confirmed", "mixing", "completed", "cancelled"];

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.order_id, o.customer_id, c.name AS customer_name, c.phone,
             o.sales_rep_id, sales.full_name AS sales_rep_name,
             o.tech_id, tech.full_name AS tech_name,
             o.shift_id, s.shift_name,
             o.total_amount, o.status, o.street_address, w.ward_name, p.province_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
      LEFT JOIN employees tech ON o.tech_id = tech.employee_id
      LEFT JOIN shifts s ON o.shift_id = s.shift_id
      LEFT JOIN wards w ON o.ward_id = w.ward_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      ORDER BY o.order_id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, c.name AS customer_name, c.phone, c.email
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = ?`,
      [req.params.id],
    );

    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const [details] = await db.query(
      `SELECT od.*, pv.sku_code, pv.volume, pl.name AS line_name, b.name AS brand_name,
              bt.base_name, cs.color_code, cs.color_name
       FROM orderdetails od
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       JOIN productlines pl ON pv.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN colorsystem cs ON od.color_id = cs.color_id
       WHERE od.order_id = ?`,
      [req.params.id],
    );

    res.json({ ...order, details });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ error: "Trạng thái đơn hàng không hợp lệ." });
  }

  try {
    const [result] = await db.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    res.json({ message: "Cập nhật trạng thái đơn hàng thành công." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/assign", async (req, res) => {
  const { sales_rep_id, tech_id, shift_id } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE orders
       SET sales_rep_id = ?, tech_id = ?, shift_id = ?
       WHERE order_id = ?`,
      [sales_rep_id || null, tech_id || null, shift_id || null, req.params.id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    res.json({ message: "Gán nhân sự/ca làm cho đơn hàng thành công." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
