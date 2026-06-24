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

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[customer]] = await connection.query(
      "SELECT street_address, ward_id, credit_limit, current_debt FROM customers WHERE customer_id = ?",
      [customerId],
    );

    const [orderResult] = await connection.query(
      `INSERT INTO orders (customer_id, total_amount, status, street_address, ward_id)
       VALUES (?, 0, 'pending', ?, ?)`,
      [
        customerId,
        street_address || customer?.street_address || null,
        ward_id || customer?.ward_id || null,
      ],
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const variantId = Number(item.variant_id);
      const colorId = Number(item.color_id);
      const quantity = Number(item.quantity || 1);

      if (!variantId || !colorId || quantity <= 0) {
        throw new Error("Dòng sản phẩm không hợp lệ.");
      }

      const [[variant]] = await connection.query(
        "SELECT unit_price FROM productvariants WHERE variant_id = ?",
        [variantId],
      );
      if (!variant) throw new Error(`Không tìm thấy biến thể sản phẩm ${variantId}.`);

      await connection.query(
        `INSERT INTO orderdetails (order_id, variant_id, color_id, quantity, price_at_sale)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, variantId, colorId, quantity, variant.unit_price],
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Tạo đơn hàng thành công.", order_id: orderId });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.get("/", async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT order_id, total_amount, status, street_address, ward_id,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at_text
       FROM orders
       WHERE customer_id = ?
       ORDER BY order_id DESC`,
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
      `SELECT order_id, total_amount, status, street_address, ward_id,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at_text
       FROM orders
       WHERE order_id = ? AND customer_id = ?`,
      [req.params.id, req.user.id],
    );
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const [details] = await db.query(
      `SELECT od.quantity, od.price_at_sale, pv.sku_code, pv.volume,
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
