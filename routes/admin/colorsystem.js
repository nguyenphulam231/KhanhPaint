const express = require("express");
const router = express.Router();
const db = require("../../db");

// Lấy danh sách mã màu
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

// Thêm mã màu và công thức pha (Dùng Transaction)
router.post("/add", async (req, res) => {
  const { color_code, color_name, base_id, formula } = req.body;

  // Lấy kết nối từ pool
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Chèn vào bảng cha
    const [colorResult] = await connection.execute(
      "INSERT INTO colorsystem (color_code, color_name, base_id) VALUES (?, ?, ?)",
      [color_code, color_name, base_id],
    );
    const newColorId = colorResult.insertId;
    console.log("ID bảng cha vừa tạo:", newColorId);

    // 2. Chèn vào bảng con
    if (formula && formula.length > 0) {
      for (const item of formula) {
        console.log("Đang insert item:", item);
        // THAY VÌ QUERY, HÃY DÙNG EXECUTE VỚI LOG LỖI TẠI CHỖ
        try {
          await connection.execute(
            "INSERT INTO colorsystem_colorants (color_id, colorant_id, amount_ml) VALUES (?, ?, ?)",
            [newColorId, item.colorant_id, item.amount_ml],
          );
        } catch (innerErr) {
          console.error("LỖI KHI INSERT BẢNG CON:", innerErr.sqlMessage);
          throw innerErr; // Ném lỗi ra để khối catch chính bắt lấy
        }
      }
    }

    await connection.commit();
    console.log("Commit thành công!");
    res.status(201).json({ message: "Thành công!" });
  } catch (err) {
    await connection.rollback();
    console.error("--- CHI TIẾT LỖI GIAO DỊCH ---");
    console.error("Thông báo:", err.message);
    console.error("SQL Lỗi:", err.sql);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.get("/formula/:colorId", async (req, res) => {
  try {
    const query = `
      SELECT c.colorant_name, f.amount_ml 
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
module.exports = router;
