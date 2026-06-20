const express = require("express");
const router = express.Router();
const db = require("../../db");

function toNullWhenEmpty(value) {
  return value === "" || value === undefined ? null : value;
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        pv.variant_id,
        pv.sku_code,
        b.name AS brand_name,
        pl.name AS line_name,
        bt.base_name,
        pv.volume,
        pv.unit_price,
        pv.stock_quantity,
        pv.warehouse_location
      FROM productvariants pv
      JOIN basetypes bt ON pv.base_id = bt.base_id
      JOIN productlines pl ON bt.line_id = pl.line_id
      JOIN brands b ON pl.brand_id = b.brand_id
      ORDER BY b.name, pl.name, bt.base_name, pv.volume
    `);
    res.json(rows);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Lỗi tải sản phẩm." });
  }
});

router.post("/add-brand", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const origin = toNullWhenEmpty(String(req.body.origin || "").trim());
  const description = toNullWhenEmpty(String(req.body.description || "").trim());

  if (!name) {
    return res.status(400).json({ error: "Tên thương hiệu không được để trống." });
  }

  try {
    await db.execute(
      "INSERT INTO brands (name, origin, description) VALUES (?, ?, ?)",
      [name, origin, description]
    );
    res.status(201).json({ message: "Thêm thương hiệu thành công!" });
  } catch (err) {
    console.error("Create brand error:", err);
    res.status(500).json({ error: "Lỗi thêm thương hiệu." });
  }
});

router.get("/brands", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT brand_id, name FROM brands ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Get brands error:", err);
    res.status(500).json({ error: "Lỗi tải thương hiệu." });
  }
});

router.post("/add-line", async (req, res) => {
  const brand_id = req.body.brand_id;
  const name = String(req.body.name || "").trim();
  const is_interior = Number(req.body.is_interior) === 1 ? 1 : 0;
  const description = toNullWhenEmpty(String(req.body.description || "").trim());

  if (!brand_id || !name) {
    return res.status(400).json({ error: "Vui lòng chọn thương hiệu và nhập tên dòng sản phẩm." });
  }

  try {
    await db.execute(
      "INSERT INTO productlines (brand_id, name, is_interior, description) VALUES (?, ?, ?, ?)",
      [brand_id, name, is_interior, description]
    );
    res.status(201).json({ message: "Thêm dòng sản phẩm thành công!" });
  } catch (err) {
    console.error("Create product line error:", err);
    res.status(500).json({ error: "Lỗi thêm dòng sản phẩm." });
  }
});

router.get("/lines", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT line_id, brand_id, name FROM productlines ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Get lines error:", err);
    res.status(500).json({ error: "Lỗi tải dòng sản phẩm." });
  }
});

router.post("/add-basetype", async (req, res) => {
  const line_id = req.body.line_id;
  const base_name = String(req.body.base_name || "").trim();
  const coverage_rate = toNullWhenEmpty(req.body.coverage_rate);
  const drying_time = toNullWhenEmpty(String(req.body.drying_time || "").trim());
  const gloss_level = toNullWhenEmpty(String(req.body.gloss_level || "").trim());
  const recommended_layers = toNullWhenEmpty(String(req.body.recommended_layers || "").trim());

  if (!line_id || !base_name) {
    return res.status(400).json({ error: "Vui lòng chọn dòng sản phẩm và nhập tên base." });
  }

  try {
    await db.execute(
      `INSERT INTO basetypes
       (line_id, base_name, coverage_rate, drying_time, gloss_level, recommended_layers)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [line_id, base_name, coverage_rate, drying_time, gloss_level, recommended_layers]
    );
    res.status(201).json({ message: "Thêm BaseType thành công!" });
  } catch (err) {
    console.error("Create base type error:", err);
    res.status(500).json({ error: "Lỗi thêm BaseType." });
  }
});

router.get("/lines-by-brand/:brand_id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT line_id, name FROM productlines WHERE brand_id = ? ORDER BY name",
      [req.params.brand_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get lines by brand error:", err);
    res.status(500).json({ error: "Lỗi tải dòng sản phẩm." });
  }
});

module.exports = router;
