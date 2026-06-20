const express = require("express");
const router = express.Router();
const db = require("../../db");

function cleanText(value) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function handleDbError(res, err, message) {
  console.error(message, err);
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ error: "Thương hiệu không tồn tại." });
  }
  return res.status(500).json({ error: "Lỗi xử lý dữ liệu." });
}

router.get("/", async (req, res) => {
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

router.get("/by-brand/:brand_id", async (req, res) => {
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

router.post("/add", async (req, res) => {
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

module.exports = router;
