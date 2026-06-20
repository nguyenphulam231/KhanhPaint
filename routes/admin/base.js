// routes/admin/base.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

// Lấy danh sách BaseTypes
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM basetypes");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm mới một loại Base (Đã bổ sung mô tả)
router.post("/add", async (req, res) => {
  const { base_name, description } = req.body;

  if (!base_name || base_name.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Tên loại base không được để trống." });
  }

  try {
    // Thêm cả base_name và description vào DB, nếu description trống thì để null
    const sql = "INSERT INTO basetypes (base_name, description) VALUES (?, ?)";
    await db.execute(sql, [
      base_name.trim(),
      description ? description.trim() : null,
    ]);

    res
      .status(201)
      .json({ success: true, message: "Thêm BaseType thành công!" });
  } catch (error) {
    console.error("Lỗi thêm base:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi thêm loại base." });
  }
});

module.exports = router;
