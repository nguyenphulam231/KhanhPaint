const express = require("express");
const router = express.Router();
const db = require("../../db");

// Lấy danh sách tinh màu (để hiển thị sau khi admin thêm)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM colorants ORDER BY colorant_id DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm tinh màu mới vào database
router.post("/add", async (req, res) => {
  const { colorant_name, stock_ml, unit_price_per_ml } = req.body;
  try {
    const [result] = await db.execute(
      "INSERT INTO colorants (colorant_name, stock_ml, unit_price_per_ml) VALUES (?, ?, ?)",
      [colorant_name, stock_ml || 0, unit_price_per_ml || 0],
    );
    res.status(201).json({
      colorant_id: result.insertId,
      message: "Thêm tinh màu thành công",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
