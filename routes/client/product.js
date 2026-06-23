const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  const { brand_id, line_id, base_id, q } = req.query;
  const where = [];
  const params = [];

  if (brand_id) {
    where.push("br.brand_id = ?");
    params.push(brand_id);
  }
  if (line_id) {
    where.push("pl.line_id = ?");
    params.push(line_id);
  }
  if (base_id) {
    where.push("bt.base_id = ?");
    params.push(base_id);
  }
  if (q) {
    where.push("(br.name LIKE ? OR pl.name LIKE ? OR pv.sku_code LIKE ? OR bt.base_name LIKE ?)");
    const term = `%${q}%`;
    params.push(term, term, term, term);
  }

  try {
    const [rows] = await db.query(
      `SELECT pv.variant_id, pv.sku_code, pv.volume, pv.unit_price, COALESCE(bi.stock_quantity, 0) AS stock_quantity, bi.warehouse_location,
              bt.base_id, bt.base_name, pl.line_id, pl.name AS line_name, pl.is_interior,
              br.brand_id, br.name AS brand_name
       FROM productvariants pv
       LEFT JOIN baseinventory bi ON pv.variant_id = bi.variant_id
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN productlines pl ON pv.line_id = pl.line_id
       JOIN brands br ON pl.brand_id = br.brand_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY br.name, pl.name, bt.base_name, pv.volume`,
      params,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/filters", async (req, res) => {
  try {
    const [brands] = await db.query("SELECT brand_id, name FROM brands ORDER BY name");
    const [lines] = await db.query("SELECT line_id, brand_id, name FROM productlines ORDER BY name");
    const [bases] = await db.query("SELECT base_id, base_name FROM basetypes ORDER BY base_name");
    res.json({ brands, lines, bases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/colors", async (req, res) => {
  const { base_id } = req.query;
  if (!base_id) return res.status(400).json({ error: "Thiếu base_id." });

  try {
    const [rows] = await db.query(
      `SELECT color_id, color_code, color_name, base_id
       FROM colorsystem
       WHERE base_id = ?
       ORDER BY color_code`,
      [base_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
