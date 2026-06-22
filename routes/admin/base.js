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

// 3. CẬP NHẬT LOẠI BASE (MỚI)
router.put("/update/:id", async (req, res) => {
  const baseId = req.params.id;
  const { base_name, description } = req.body;

  if (!base_name || base_name.trim() === "") {
    return res
      .status(400)
      .json({ error: "Tên loại base không được để trống!" });
  }

  try {
    // Lưu ý đối chiếu chuẩn xác tên cột khóa chính dưới DB (ví dụ: base_id hoặc id)
    const [result] = await db.execute(
      "UPDATE basetypes SET base_name = ?, description = ? WHERE base_id = ?",
      [base_name.trim(), description ? description.trim() : null, baseId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy loại base để cập nhật!" });
    }
    res.json({ message: "Cập nhật loại base thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. XÓA LOẠI BASE (MỚI)
router.delete("/delete/:id", async (req, res) => {
  const baseId = req.params.id;
  try {
    const [result] = await db.execute(
      "DELETE FROM basetypes WHERE base_id = ?",
      [baseId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy loại base để xóa!" });
    }
    res.json({ message: "Đã xóa loại base thành công!" });
  } catch (err) {
    res.status(500).json({
      error:
        "Không thể xóa loại base này vì đang có các sản phẩm/biến thể thuộc nhóm base này!" ||
        err.message,
    });
  }
});

module.exports = router;
