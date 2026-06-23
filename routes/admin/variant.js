// routes/admin/variant.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

function toPositiveInt(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function toNonNegativeMoney(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

// 1. Lấy danh sách product variants, tồn kho lấy từ BaseInventory để đúng ERD.
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT pv.variant_id, pv.line_id, pv.base_id, pv.volume, pv.sku_code, pv.unit_price,
             COALESCE(bi.stock_quantity, 0) AS stock_quantity,
             bi.warehouse_location,
             bi.reorder_level,
             pl.name AS line_name, b.base_name, br.name AS brand_name
      FROM productvariants pv
      LEFT JOIN baseinventory bi ON pv.variant_id = bi.variant_id
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

// 2. Thêm product variant mới: ProductVariants là danh mục, BaseInventory là tồn kho.
router.post("/add", async (req, res) => {
  const {
    line_id,
    base_id,
    volume,
    sku_code,
    unit_price,
    stock_quantity,
    warehouse_location,
    reorder_level,
  } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO productvariants
       (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        line_id,
        base_id,
        volume || null,
        sku_code,
        toNonNegativeMoney(unit_price),
        toPositiveInt(stock_quantity), // legacy mirror, không còn là nguồn tồn kho chính
        warehouse_location || null,
      ],
    );

    await connection.execute(
      `INSERT INTO baseinventory (variant_id, stock_quantity, warehouse_location, reorder_level)
       VALUES (?, ?, ?, ?)`,
      [
        result.insertId,
        toPositiveInt(stock_quantity),
        warehouse_location || null,
        toPositiveInt(reorder_level, 5),
      ],
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      variant_id: result.insertId,
      message: "Thêm product variant và BaseInventory thành công!",
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 3. Cập nhật product variant và tồn kho BaseInventory.
router.put("/update/:variant_id", async (req, res) => {
  const {
    line_id,
    base_id,
    volume,
    sku_code,
    unit_price,
    stock_quantity,
    warehouse_location,
    reorder_level,
  } = req.body;
  const { variant_id } = req.params;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE productvariants
       SET line_id = ?, base_id = ?, volume = ?, sku_code = ?, unit_price = ?,
           stock_quantity = ?, warehouse_location = ?
       WHERE variant_id = ?`,
      [
        line_id,
        base_id,
        volume || null,
        sku_code,
        toNonNegativeMoney(unit_price),
        toPositiveInt(stock_quantity), // legacy mirror để tương thích dữ liệu cũ
        warehouse_location || null,
        variant_id,
      ],
    );

    await connection.execute(
      `INSERT INTO baseinventory (variant_id, stock_quantity, warehouse_location, reorder_level)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stock_quantity = VALUES(stock_quantity),
         warehouse_location = VALUES(warehouse_location),
         reorder_level = VALUES(reorder_level)`,
      [
        variant_id,
        toPositiveInt(stock_quantity),
        warehouse_location || null,
        toPositiveInt(reorder_level, 5),
      ],
    );

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật product variant và BaseInventory thành công!",
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 4. Xóa product variant
router.delete("/delete/:variant_id", async (req, res) => {
  const { variant_id } = req.params;

  try {
    await db.execute("DELETE FROM productvariants WHERE variant_id = ?", [variant_id]);
    res.json({ success: true, message: "Xóa product variant thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
