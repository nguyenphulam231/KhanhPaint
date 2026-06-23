const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách mã màu
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

// 2. Thêm mã màu và công thức pha version 1
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

    if (Array.isArray(formula) && formula.length > 0) {
      for (const item of formula) {
        await connection.execute(
          `INSERT INTO colorsystem_colorants
           (color_id, colorant_id, amount_ml, formula_version, is_active)
           VALUES (?, ?, ?, 1, 1)`,
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

// 3. Lấy công thức active hiện tại của một mã màu
router.get("/formula/:colorId", async (req, res) => {
  try {
    const query = `
      SELECT f.colorant_id, c.colorant_name, f.amount_ml, f.formula_version,
             f.effective_from, f.effective_to, f.is_active
      FROM colorsystem_colorants f
      JOIN colorants c ON f.colorant_id = c.colorant_id
      WHERE f.color_id = ?
        AND f.is_active = 1
        AND (f.effective_to IS NULL OR f.effective_to > NOW())
      ORDER BY f.formula_version DESC, c.colorant_name
    `;
    const [rows] = await db.execute(query, [req.params.colorId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Cập nhật mã màu và tạo công thức version mới, không xóa lịch sử công thức cũ.
router.put("/update/:colorId", async (req, res) => {
  const { colorId } = req.params;
  const { color_code, color_name, base_id, formula } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      "UPDATE colorsystem SET color_code = ?, color_name = ?, base_id = ? WHERE color_id = ?",
      [color_code, color_name, base_id, colorId],
    );

    if (Array.isArray(formula) && formula.length > 0) {
      const [[versionRow]] = await connection.execute(
        "SELECT COALESCE(MAX(formula_version), 0) + 1 AS next_version FROM colorsystem_colorants WHERE color_id = ?",
        [colorId],
      );
      const nextVersion = versionRow.next_version || 1;

      await connection.execute(
        `UPDATE colorsystem_colorants
         SET is_active = 0, effective_to = NOW()
         WHERE color_id = ? AND is_active = 1`,
        [colorId],
      );

      for (const item of formula) {
        await connection.execute(
          `INSERT INTO colorsystem_colorants
           (color_id, colorant_id, amount_ml, formula_version, effective_from, is_active)
           VALUES (?, ?, ?, ?, NOW(), 1)`,
          [colorId, item.colorant_id, item.amount_ml, nextVersion],
        );
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật mã màu và tạo công thức version mới thành công!",
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 5. Xóa mã màu nếu chưa từng phát sinh đơn hàng.
router.delete("/delete/:colorId", async (req, res) => {
  const { colorId } = req.params;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[usage]] = await connection.execute(
      "SELECT COUNT(*) AS count_used FROM orderdetails WHERE color_id = ?",
      [colorId],
    );
    if (usage.count_used > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "Không thể xóa mã màu đã phát sinh đơn hàng vì cần giữ lịch sử pha màu.",
      });
    }

    await connection.execute("DELETE FROM colorsystem_colorants WHERE color_id = ?", [colorId]);
    const [result] = await connection.execute("DELETE FROM colorsystem WHERE color_id = ?", [colorId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Không tìm thấy mã màu để xóa!" });
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
