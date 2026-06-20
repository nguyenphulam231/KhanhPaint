// routes/admin/brand.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

// Lấy danh sách thương hiệu (thường dùng để load vào select)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM brands");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm thương hiệu mới
router.post("/add", async (req, res) => {
  const { name, origin, description } = req.body;
  try {
    const [result] = await db.execute(
      "INSERT INTO brands (name, origin, description) VALUES (?, ?, ?)",
      [name, origin, description],
    );
    res
      .status(201)
      .json({ brand_id: result.insertId, message: "Thêm thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
