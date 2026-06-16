const express = require("express");
const router = express.Router();
const db = require("../../db");

// Lấy toàn bộ danh sách sản phẩm (Product Variants)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
            SELECT p.sku_code, b.base_name, pl.name as line_name, p.unit_price 
            FROM ProductVariants p
            JOIN BaseTypes b ON p.base_id = b.base_id
            JOIN ProductLines pl ON b.line_id = pl.line_id
        `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm vào routes/product.js
router.post("/add-brand", async (req, res) => {
  const { name, origin, description } = req.body;
  try {
    const sql =
      "INSERT INTO brands (name, origin, description) VALUES (?, ?, ?)";
    await db.execute(sql, [name, origin, description]);
    res.status(200).json({ message: "Thêm thương hiệu thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi thêm thương hiệu." });
  }
});

// Lấy danh sách thương hiệu để đổ vào dropdown
router.get("/brands", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT brand_id, name FROM brands");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi tải thương hiệu" });
  }
});

// Lưu ProductLine
router.post("/add-line", async (req, res) => {
  const { brand_id, name, is_interior, description } = req.body;
  try {
    const sql =
      "INSERT INTO productlines (brand_id, name, is_interior, description) VALUES (?, ?, ?, ?)";
    await db.execute(sql, [brand_id, name, is_interior, description]);
    res.status(200).json({ message: "Thêm dòng sản phẩm thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi thêm dòng sản phẩm." });
  }
});

// Lấy danh sách Dòng sản phẩm (để chọn khi thêm BaseType)
router.get("/lines", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT line_id, name FROM productlines");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi tải dòng sản phẩm" });
  }
});

// Lưu BaseType mới
router.post("/add-basetype", async (req, res) => {
  const {
    line_id,
    base_name,
    coverage_rate,
    drying_time,
    gloss_level,
    recommended_layers,
  } = req.body;
  try {
    const sql = `INSERT INTO basetypes (line_id, base_name, coverage_rate, drying_time, gloss_level, recommended_layers) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
    await db.execute(sql, [
      line_id,
      base_name,
      coverage_rate,
      drying_time,
      gloss_level,
      recommended_layers,
    ]);
    res.status(200).json({ message: "Thêm BaseType thành công!" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi thêm BaseType." });
  }
});

router.get("/lines-by-brand/:brand_id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT line_id, name FROM productlines WHERE brand_id = ?",
      [req.params.brand_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi tải dòng sản phẩm" });
  }
});

module.exports = router;
