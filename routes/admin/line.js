// routes/admin/line.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Thêm dòng sản phẩm mới (Đầy đủ thông số kỹ thuật)
router.post("/add", async (req, res) => {
  const {
    brand_id,
    name,
    is_interior,
    coverage_rate,
    drying_time,
    gloss_level,
    recommended_layers,
    description,
  } = req.body;

  try {
    const query = `
      INSERT INTO productlines 
      (brand_id, name, is_interior, coverage_rate, drying_time, gloss_level, recommended_layers, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Xử lý các giá trị số hoặc chuỗi nếu để trống thì lưu NULL vào DB
    const params = [
      brand_id,
      name,
      is_interior || 0, // Mặc định là 0 nếu không chọn
      coverage_rate ? parseFloat(coverage_rate) : null,
      drying_time || null,
      gloss_level || null,
      recommended_layers || null,
      description || null,
    ];

    await db.execute(query, params);
    res
      .status(201)
      .json({ success: true, message: "Thêm dòng sản phẩm thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API lấy danh sách dòng sản phẩm theo brand
router.get("/by-brand/:brand_id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM productlines WHERE brand_id = ?",
      [req.params.brand_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
