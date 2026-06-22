const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [[orderStats]] = await db.query(`
      SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS revenue
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
      WHERE status IN ('pending', 'confirmed')
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
