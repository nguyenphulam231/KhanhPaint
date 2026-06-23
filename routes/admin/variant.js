// routes/admin/variant.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách product variants
router.get("/", async (req, res) => {
  const { brand_id, line_id, base_id, volume, sku_code, price_min, price_max } =
    req.query;

  let conditions = [];
  let params = [];

  if (brand_id) {
    conditions.push("br.brand_id = ?");
    params.push(brand_id);
  }
  if (line_id) {
    conditions.push("pv.line_id = ?");
    params.push(line_id);
  }
  if (base_id) {
    conditions.push("pv.base_id = ?");
    params.push(base_id);
  }
  if (volume) {
    conditions.push("pv.volume = ?");
    params.push(volume);
  }
  if (sku_code) {
    conditions.push("pv.sku_code LIKE ?");
    params.push(`%${sku_code}%`);
  }
  if (price_min) {
    conditions.push("pv.unit_price >= ?");
    params.push(parseFloat(price_min));
  }
  if (price_max) {
    conditions.push("pv.unit_price <= ?");
    params.push(parseFloat(price_max));
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const [rows] = await db.execute(
      `
      SELECT pv.*, pl.name AS line_name, b.base_name, br.name AS brand_name, br.brand_id
      FROM productvariants pv
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN basetypes b ON pv.base_id = b.base_id
      JOIN brands br ON pl.brand_id = br.brand_id
      ${whereClause}
      ORDER BY pv.variant_id DESC
    `,
      params,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Thêm product variant mới
router.post("/add", async (req, res) => {
  const {
    line_id,
    base_id,
    volume,
    sku_code,
    unit_price,
    stock_quantity,
    warehouse_location,
  } = req.body;

  try {
    const query = `
      INSERT INTO productvariants 
      (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      line_id,
      base_id,
      volume || null,
      sku_code,
      parseFloat(unit_price) || 0,
      parseInt(stock_quantity) || 0,
      warehouse_location || null,
    ];

    const [result] = await db.execute(query, params);
    res.status(201).json({
      success: true,
      variant_id: result.insertId,
      message: "Thêm product variant thành công!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Cập nhật product variant
router.put("/update/:variant_id", async (req, res) => {
  const {
    line_id,
    base_id,
    volume,
    sku_code,
    unit_price,
    stock_quantity,
    warehouse_location,
  } = req.body;
  const { variant_id } = req.params;

  try {
    const query = `
      UPDATE productvariants 
      SET line_id = ?, base_id = ?, volume = ?, sku_code = ?, unit_price = ?, stock_quantity = ?, warehouse_location = ?
      WHERE variant_id = ?
    `;

    const params = [
      line_id,
      base_id,
      volume || null,
      sku_code,
      parseFloat(unit_price) || 0,
      parseInt(stock_quantity) || 0,
      warehouse_location || null,
      variant_id,
    ];

    await db.execute(query, params);
    res.json({
      success: true,
      message: "Cập nhật product variant thành công!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Xóa product variant
router.delete("/delete/:variant_id", async (req, res) => {
  const { variant_id } = req.params;

  try {
    await db.execute("DELETE FROM productvariants WHERE variant_id = ?", [
      variant_id,
    ]);
    res.json({ success: true, message: "Xóa product variant thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
