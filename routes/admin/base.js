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

function handleDbError(res, err, message) {
  console.error(message, err);
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ error: "Dòng sản phẩm không tồn tại." });
  }
  return res.status(500).json({ error: "Lỗi xử lý dữ liệu." });
}

router.get("/", async (req, res) => {
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

router.get("/by-line/:line_id", async (req, res) => {
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

router.post("/add", async (req, res) => {
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
