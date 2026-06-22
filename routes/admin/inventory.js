const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/movements", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const params = [];
  const where = [];

  if (req.query.order_id) {
    where.push("im.order_id = ?");
    params.push(req.query.order_id);
  }

  if (req.query.inventory_type) {
    where.push("im.inventory_type = ?");
    params.push(req.query.inventory_type);
  }

  try {
    const [rows] = await db.query(
      `SELECT im.movement_id, im.created_at, im.inventory_type, im.movement_type,
              im.order_id, im.quantity_delta, im.before_quantity, im.after_quantity,
              im.note, pv.sku_code, c.colorant_name
       FROM inventory_movements im
       LEFT JOIN productvariants pv ON im.variant_id = pv.variant_id
       LEFT JOIN colorants c ON im.colorant_id = c.colorant_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY im.movement_id DESC
       LIMIT ${limit}`,
      params,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/low-stock", async (req, res) => {
  try {
    const [baseStock] = await db.query(
      `SELECT variant_id, sku_code, stock_quantity, warehouse_location
       FROM productvariants
       WHERE stock_quantity <= 5
       ORDER BY stock_quantity ASC, sku_code ASC`,
    );

    const [colorantStock] = await db.query(
      `SELECT colorant_id, colorant_name, stock_ml, unit_price_per_ml
       FROM colorants
       WHERE stock_ml <= 1000
       ORDER BY stock_ml ASC, colorant_name ASC`,
    );

    res.json({ baseStock, colorantStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
