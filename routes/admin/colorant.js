const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách tinh màu (Đã có - Giữ nguyên)
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

// 2. Thêm tinh màu mới vào database (Đã có - Giữ nguyên)
router.post("/add", async (req, res) => {
  const { colorant_name, stock_ml, unit_price_per_ml } = req.body;
  try {
    const [result] = await db.execute(
      "INSERT INTO colorants (colorant_name, stock_ml, unit_price_per_ml) VALUES (?, ?, ?)",
      [colorant_name, stock_ml || 0, unit_price_per_ml || 0],
    );
    res.status(201).json({
      success: true,
      colorant_id: result.insertId,
      message: "Thêm tinh màu thành công",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CẬP NHẬT THÔNG TIN TINH MÀU (MỚI)
router.put("/update/:id", async (req, res) => {
  const colorantId = req.params.id;
  const { colorant_name, stock_ml, unit_price_per_ml } = req.body;

  if (!colorant_name || colorant_name.trim() === "") {
    return res
      .status(400)
      .json({ success: false, error: "Tên tinh màu không được để trống!" });
  }

  try {
    const query = `
      UPDATE colorants 
      SET colorant_name = ?, stock_ml = ?, unit_price_per_ml = ? 
      WHERE colorant_id = ?
    `;
    const params = [
      colorant_name.trim(),
      parseFloat(stock_ml) || 0,
      parseFloat(unit_price_per_ml) || 0,
      colorantId,
    ];

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: "Không tìm thấy tinh màu để cập nhật!",
        });
    }
    res.json({ success: true, message: "Cập nhật tinh màu thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. XÓA TINH MÀU (MỚI)
router.delete("/delete/:id", async (req, res) => {
  const colorantId = req.params.id;
  try {
    const [result] = await db.execute(
      "DELETE FROM colorants WHERE colorant_id = ?",
      [colorantId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy tinh màu để xóa!" });
    }
    res.json({ success: true, message: "Đã xóa tinh màu thành công!" });
  } catch (err) {
    // Đề phòng trường hợp tinh màu này đang nằm trong công thức pha màu (bảng RecipeDetails)
    res.status(500).json({
      success: false,
      error:
        "Không thể xóa tinh màu này vì nó đang được dùng trong các công thức pha màu sơn của hệ thống!" ||
        err.message,
    });
  }
});

module.exports = router;
