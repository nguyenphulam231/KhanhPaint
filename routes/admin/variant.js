// routes/admin/variant.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách product variants
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT pv.*, pl.name AS line_name, b.base_name, br.name AS brand_name
      FROM productvariants pv
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN basetypes b ON pv.base_id = b.base_id
      JOIN brands br ON pl.brand_id = br.brand_id
      ORDER BY pv.variant_id DESC
    `);
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
