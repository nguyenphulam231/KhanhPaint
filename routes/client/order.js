const express = require("express");
const router = express.Router();
const db = require("../../db");
const { authenticate, authorizeCustomer } = require("../../middleware/authMiddleware");

router.use(authenticate, authorizeCustomer);

router.post("/", async (req, res) => {
  const { items, street_address, ward_id } = req.body;
  const customerId = req.user.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Đơn hàng phải có ít nhất một sản phẩm." });
  }

  const normalizedItems = items.map((item) => ({
    variant_id: Number(item.variant_id),
    color_id: Number(item.color_id),
    quantity: Number(item.quantity || 1),
  }));

  if (normalizedItems.some((item) => !item.variant_id || !item.color_id || item.quantity <= 0)) {
    return res.status(400).json({ error: "Dòng sản phẩm không hợp lệ." });
  }

  try {
    const [resultSets] = await db.query(
      "CALL sp_create_order(?, ?, ?, ?)",
      [customerId, JSON.stringify(normalizedItems), street_address || null, ward_id || null],
    );

    const orderId = resultSets?.[0]?.[0]?.order_id;
    res.status(201).json({ message: "Tạo đơn hàng thành công.", order_id: orderId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT order_id, total_amount, paid_amount, payment_status, status, street_address, ward_id, created_at, updated_at
       FROM orders
       WHERE customer_id = ?
       ORDER BY created_at DESC, order_id DESC`,
      [req.user.id],
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT order_id, total_amount, paid_amount, payment_status, status, street_address, ward_id, created_at, updated_at
       FROM orders
       WHERE order_id = ? AND customer_id = ?`,
      [req.params.id, req.user.id],
    );
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const [details] = await db.query(
      `SELECT od.quantity, od.price_at_sale, od.formula_version, od.mix_status, od.qc_status, pv.sku_code, pv.volume,
              pl.name AS line_name, br.name AS brand_name,
              bt.base_name, cs.color_code, cs.color_name
       FROM orderdetails od
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       JOIN productlines pl ON pv.line_id = pl.line_id
       JOIN brands br ON pl.brand_id = br.brand_id
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

module.exports = router;
