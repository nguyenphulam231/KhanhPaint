const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [[orderStats]] = await db.query(`
      SELECT COUNT(*) AS total_orders,
             COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS completed_revenue,
             COALESCE(SUM(CASE WHEN status IN ('pending', 'confirmed', 'mixing') THEN total_amount ELSE 0 END), 0) AS active_order_value,
             SUM(status = 'cancelled') AS cancelled_orders
      FROM orders
    `);

    const [[customerStats]] = await db.query("SELECT COUNT(*) AS total_customers FROM customers");
    const [[variantStats]] = await db.query(`
      SELECT COUNT(*) AS total_variants, COALESCE(SUM(stock_quantity), 0) AS base_stock
      FROM productvariants
    `);
    const [[colorantStats]] = await db.query(`
      SELECT COUNT(*) AS total_colorants, COALESCE(SUM(stock_ml), 0) AS colorant_stock_ml
      FROM colorants
    `);
    const [[pendingStats]] = await db.query(`
      SELECT COUNT(*) AS pending_orders
      FROM orders
      WHERE status IN ('pending', 'confirmed', 'mixing')
    `);

    const [statusBreakdown] = await db.query(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_amount
      FROM orders
      GROUP BY status
      ORDER BY FIELD(status, 'pending', 'confirmed', 'mixing', 'completed', 'cancelled')
    `);

    const [lowBaseStock] = await db.query(`
      SELECT pv.variant_id, pv.sku_code, pv.volume, pv.stock_quantity,
             pv.warehouse_location, pl.name AS line_name, br.name AS brand_name, bt.base_name
      FROM productvariants pv
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN brands br ON pl.brand_id = br.brand_id
      JOIN basetypes bt ON pv.base_id = bt.base_id
      WHERE pv.stock_quantity <= 10
      ORDER BY pv.stock_quantity ASC, pv.variant_id ASC
      LIMIT 8
    `);

    const [lowColorants] = await db.query(`
      SELECT colorant_id, colorant_name, stock_ml, unit_price_per_ml
      FROM colorants
      WHERE stock_ml <= 1000
      ORDER BY stock_ml ASC, colorant_id ASC
      LIMIT 8
    `);

    const [recentOrders] = await db.query(`
      SELECT o.order_id, c.name AS customer_name, o.status, o.total_amount,
             DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at_text
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      ORDER BY o.created_at DESC, o.order_id DESC
      LIMIT 8
    `);

    res.json({
      message: "Chào mừng Admin",
      stats: {
        ...orderStats,
        ...customerStats,
        ...variantStats,
        ...colorantStats,
        ...pendingStats,
      },
      status_breakdown: statusBreakdown,
      low_base_stock: lowBaseStock,
      low_colorants: lowColorants,
      recent_orders: recentOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
