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

// 3. CẬP NHẬT THƯƠNG HIỆU
router.put("/update/:id", async (req, res) => {
  const brandId = req.params.id;
  const { name, origin, description } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ error: "Tên thương hiệu không được để trống!" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE brands SET name = ?, origin = ?, description = ? WHERE brand_id = ?",
      [name, origin || null, description || null, brandId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thương hiệu để cập nhật!" });
    }
    res.json({ message: "Cập nhật thương hiệu thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. XÓA THƯƠNG HIỆU
router.delete("/delete/:id", async (req, res) => {
  const brandId = req.params.id;
  try {
    const [result] = await db.execute("DELETE FROM brands WHERE brand_id = ?", [
      brandId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thương hiệu để xóa!" });
    }
    res.json({ message: "Đã xóa thương hiệu thành công!" });
  } catch (err) {
    // Phòng trường hợp thương hiệu này đang ràng buộc khóa ngoại với bảng Lines (Dòng sơn/sản phẩm)
    res.status(500).json({
      error:
        "Không thể xóa thương hiệu này vì đang có các dòng sản phẩm thuộc thương hiệu!" ||
        err.message,
    });
  }
});

module.exports = router;
