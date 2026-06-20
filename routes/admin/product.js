const express = require("express");
const router = express.Router();
const db = require("../../db");

function cleanText(value) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNonNegativeInt(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

function handleDbError(res, err, message) {
  console.error(message, err);

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Dữ liệu đã tồn tại." });
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ error: "Dữ liệu liên kết không tồn tại." });
  }

  return res.status(500).json({ error: "Lỗi xử lý dữ liệu." });
}

async function getVariantRows() {
  const [rows] = await db.execute(`
    SELECT
      pv.variant_id,
      pv.base_id,
      pv.volume,
      pv.sku_code,
      pv.unit_price,
      pv.stock_quantity,
      pv.warehouse_location,
      bt.base_name,
      bt.line_id,
      pl.name AS line_name,
      br.brand_id,
      br.name AS brand_name
    FROM productvariants pv
    JOIN basetypes bt ON pv.base_id = bt.base_id
    JOIN productlines pl ON bt.line_id = pl.line_id
    JOIN brands br ON pl.brand_id = br.brand_id
    ORDER BY pv.variant_id DESC
  `);

  return rows;
}

router.get("/", async (req, res) => {
  try {
    res.json(await getVariantRows());
  } catch (err) {
    handleDbError(res, err, "Get products error:");
  }
});

router.get("/variants", async (req, res) => {
  try {
    res.json(await getVariantRows());
  } catch (err) {
    handleDbError(res, err, "Get variants error:");
  }
});

router.post("/add-variant", async (req, res) => {
  const base_id = req.body.base_id;
  const volume = cleanText(req.body.volume);
  const sku_code = cleanText(req.body.sku_code);
  const unit_price = Number(req.body.unit_price);
  const stock_quantity = toNonNegativeInt(req.body.stock_quantity, 0);
  const warehouse_location = cleanText(req.body.warehouse_location);

  if (!base_id || !sku_code || !Number.isFinite(unit_price) || unit_price < 0) {
    return res.status(400).json({
      error: "Vui lòng chọn BaseType, nhập SKU và giá bán hợp lệ.",
    });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO productvariants
       (base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location]
    );

    res.status(201).json({
      success: true,
      variant_id: result.insertId,
      message: "Thêm Product Variant thành công.",
    });
  } catch (err) {
    handleDbError(res, err, "Create variant error:");
  }
});

router.put("/update-variant/:variant_id", async (req, res) => {
  const base_id = req.body.base_id;
  const volume = cleanText(req.body.volume);
  const sku_code = cleanText(req.body.sku_code);
  const unit_price = Number(req.body.unit_price);
  const stock_quantity = toNonNegativeInt(req.body.stock_quantity, 0);
  const warehouse_location = cleanText(req.body.warehouse_location);

  if (!base_id || !sku_code || !Number.isFinite(unit_price) || unit_price < 0) {
    return res.status(400).json({
      error: "Vui lòng chọn BaseType, nhập SKU và giá bán hợp lệ.",
    });
  }

  try {
    await db.execute(
      `UPDATE productvariants
       SET base_id = ?, volume = ?, sku_code = ?, unit_price = ?, stock_quantity = ?, warehouse_location = ?
       WHERE variant_id = ?`,
      [
        base_id,
        volume,
        sku_code,
        unit_price,
        stock_quantity,
        warehouse_location,
        req.params.variant_id,
      ]
    );

    res.json({ success: true, message: "Cập nhật Product Variant thành công." });
  } catch (err) {
    handleDbError(res, err, "Update variant error:");
  }
});

router.delete("/delete-variant/:variant_id", async (req, res) => {
  try {
    await db.execute("DELETE FROM productvariants WHERE variant_id = ?", [
      req.params.variant_id,
    ]);
    res.json({ success: true, message: "Xóa Product Variant thành công." });
  } catch (err) {
    handleDbError(res, err, "Delete variant error:");
  }
});

router.get("/brands", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT brand_id, name, origin, description FROM brands ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get brands error:");
  }
});

router.post("/add-brand", async (req, res) => {
  const name = cleanText(req.body.name);
  const origin = cleanText(req.body.origin);
  const description = cleanText(req.body.description);

  if (!name) {
    return res.status(400).json({ error: "Tên thương hiệu không được để trống." });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO brands (name, origin, description) VALUES (?, ?, ?)",
      [name, origin, description]
    );
    res.status(201).json({
      success: true,
      brand_id: result.insertId,
      message: "Thêm thương hiệu thành công.",
    });
  } catch (err) {
    handleDbError(res, err, "Create brand error:");
  }
});

router.get("/lines", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT pl.line_id, pl.brand_id, pl.name, pl.is_interior, pl.description, br.name AS brand_name
      FROM productlines pl
      JOIN brands br ON pl.brand_id = br.brand_id
      ORDER BY br.name, pl.name
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get product lines error:");
  }
});

router.get("/lines-by-brand/:brand_id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT line_id, brand_id, name, is_interior, description
       FROM productlines
       WHERE brand_id = ?
       ORDER BY name`,
      [req.params.brand_id]
    );
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get lines by brand error:");
  }
});

router.post("/add-line", async (req, res) => {
  const brand_id = req.body.brand_id;
  const name = cleanText(req.body.name);
  const is_interior = Number(req.body.is_interior) === 1 ? 1 : 0;
  const description = cleanText(req.body.description);

  if (!brand_id || !name) {
    return res.status(400).json({
      error: "Vui lòng chọn thương hiệu và nhập tên dòng sản phẩm.",
    });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO productlines (brand_id, name, is_interior, description)
       VALUES (?, ?, ?, ?)`,
      [brand_id, name, is_interior, description]
    );

    res.status(201).json({
      success: true,
      line_id: result.insertId,
      message: "Thêm dòng sản phẩm thành công.",
    });
  } catch (err) {
    handleDbError(res, err, "Create product line error:");
  }
});

router.get("/basetypes", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        bt.base_id,
        bt.line_id,
        bt.base_name,
        bt.coverage_rate,
        bt.drying_time,
        bt.gloss_level,
        bt.recommended_layers,
        pl.name AS line_name,
        br.brand_id,
        br.name AS brand_name
      FROM basetypes bt
      JOIN productlines pl ON bt.line_id = pl.line_id
      JOIN brands br ON pl.brand_id = br.brand_id
      ORDER BY br.name, pl.name, bt.base_name
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get base types error:");
  }
});

router.get("/basetypes-by-line/:line_id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT base_id, line_id, base_name, coverage_rate, drying_time, gloss_level, recommended_layers
       FROM basetypes
       WHERE line_id = ?
       ORDER BY base_name`,
      [req.params.line_id]
    );
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get base types by line error:");
  }
});

router.post("/add-basetype", async (req, res) => {
  const line_id = req.body.line_id;
  const base_name = cleanText(req.body.base_name);
  const coverage_rate = toNullableNumber(req.body.coverage_rate);
  const drying_time = cleanText(req.body.drying_time);
  const gloss_level = cleanText(req.body.gloss_level);
  const recommended_layers = cleanText(req.body.recommended_layers);

  if (!line_id || !base_name) {
    return res.status(400).json({
      error: "Vui lòng chọn dòng sản phẩm và nhập tên BaseType.",
    });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO basetypes
       (line_id, base_name, coverage_rate, drying_time, gloss_level, recommended_layers)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [line_id, base_name, coverage_rate, drying_time, gloss_level, recommended_layers]
    );

    res.status(201).json({
      success: true,
      base_id: result.insertId,
      message: "Thêm BaseType thành công.",
    });
  } catch (err) {
    handleDbError(res, err, "Create base type error:");
  }
});

module.exports = router;
