const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [[orderStats]] = await db.query(`
      SELECT COUNT(*) AS total_orders,
             COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue,
             COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN paid_amount ELSE 0 END), 0) AS paid_revenue
      FROM orders
    `);
    const [[customerStats]] = await db.query(`
      SELECT COUNT(*) AS total_customers,
             COALESCE(SUM(current_debt), 0) AS total_customer_debt
      FROM customers
    `);
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
      WHERE status IN ('pending', 'confirmed')
    `);
    const [[movementStats]] = await db.query(`
      SELECT COUNT(*) AS inventory_movements
      FROM inventory_movements
    `);

    res.json({
      message: "Chào mừng Admin",
      stats: {
        ...orderStats,
        ...customerStats,
        ...variantStats,
        ...colorantStats,
        ...pendingStats,
        ...movementStats,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
