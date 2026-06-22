const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách mã màu (Đã có - Giữ nguyên)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT c.*, b.base_name 
      FROM colorsystem c
      JOIN basetypes b ON c.base_id = b.base_id
      ORDER BY c.color_id DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Thêm mã màu và công thức pha (Đã có - Giữ nguyên)
router.post("/add", async (req, res) => {
  const { color_code, color_name, base_id, formula } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [colorResult] = await connection.execute(
      "INSERT INTO colorsystem (color_code, color_name, base_id) VALUES (?, ?, ?)",
      [color_code, color_name, base_id],
    );
    const newColorId = colorResult.insertId;

    if (formula && formula.length > 0) {
      for (const item of formula) {
        await connection.execute(
          "INSERT INTO colorsystem_colorants (color_id, colorant_id, amount_ml) VALUES (?, ?, ?)",
          [newColorId, item.colorant_id, item.amount_ml],
        );
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: "Thêm mã màu thành công!" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 3. Lấy công thức chi tiết của một mã màu (Đã có - Bổ sung thêm colorant_id để front-end dễ mapping form sửa)
router.get("/formula/:colorId", async (req, res) => {
  try {
    const query = `
      SELECT f.colorant_id, c.colorant_name, f.amount_ml 
      FROM colorsystem_colorants f
      JOIN colorants c ON f.colorant_id = c.colorant_id
      WHERE f.color_id = ?
    `;
    const [rows] = await db.execute(query, [req.params.colorId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CẬP NHẬT MÃ MÀU VÀ CÔNG THỨC PHA (MỚI)
router.put("/update/:colorId", async (req, res) => {
  const { colorId } = req.params;
  const { color_code, color_name, base_id, formula } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Cập nhật thông tin bảng cha (Mã màu, tên màu, loại base cốt)
    await connection.execute(
      "UPDATE colorsystem SET color_code = ?, color_name = ?, base_id = ? WHERE color_id = ?",
      [color_code, color_name, base_id, colorId],
    );

    // Xóa toàn bộ công thức tinh màu cũ của mã màu này trong bảng con
    await connection.execute(
      "DELETE FROM colorsystem_colorants WHERE color_id = ?",
      [colorId],
    );

    // Chèn lại tập hợp công thức tinh màu mới (nếu có)
    if (formula && formula.length > 0) {
      for (const item of formula) {
        await connection.execute(
          "INSERT INTO colorsystem_colorants (color_id, colorant_id, amount_ml) VALUES (?, ?, ?)",
          [colorId, item.colorant_id, item.amount_ml],
        );
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật mã màu và công thức thành công!",
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 5. XÓA MÃ MÀU VÀ CÔNG THỨC PHA (MỚI)
router.delete("/delete/:colorId", async (req, res) => {
  const { colorId } = req.params;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Xóa bảng con trước để giải phóng ràng buộc khóa ngoại (Foreign Key)
    await connection.execute(
      "DELETE FROM colorsystem_colorants WHERE color_id = ?",
      [colorId],
    );

    // Xóa mã màu ở bảng cha
    const [result] = await connection.execute(
      "DELETE FROM colorsystem WHERE color_id = ?",
      [colorId],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy mã màu để xóa!" });
    }

    await connection.commit();
    res.json({ success: true, message: "Xóa mã màu thành công!" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
