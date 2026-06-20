const express = require("express");
const router = express.Router();
const db = require("../../db");

function cleanText(value) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function toNonNegativeInt(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

function handleDbError(res, err, message) {
  console.error(message, err);
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "SKU đã tồn tại." });
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ error: "BaseType không tồn tại." });
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
    handleDbError(res, err, "Get variants error:");
  }
});

router.post("/add", async (req, res) => {
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

router.delete("/delete/:variant_id", async (req, res) => {
  try {
    await db.execute("DELETE FROM productvariants WHERE variant_id = ?", [
      req.params.variant_id,
    ]);
    res.json({ success: true, message: "Xóa Product Variant thành công." });
  } catch (err) {
    handleDbError(res, err, "Delete variant error:");
  }
});

module.exports = router;
