// routes/admin/line.js
const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT pl.*, b.name AS brand_name 
      FROM productlines pl
      LEFT JOIN brands b ON pl.brand_id = b.brand_id
      ORDER BY pl.line_id DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm dòng sản phẩm mới (Đầy đủ thông số kỹ thuật)
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

// 4. CẬP NHẬT THÔNG TIN DÒNG SƠN (MỚI)
router.put("/update/:id", async (req, res) => {
  const lineId = req.params.id;
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

  if (!name || !brand_id) {
    return res
      .status(400)
      .json({ error: "Tên dòng sản phẩm và thương hiệu không được để trống!" });
  }

  try {
    const query = `
      UPDATE productlines 
      SET brand_id = ?, name = ?, is_interior = ?, coverage_rate = ?, drying_time = ?, gloss_level = ?, recommended_layers = ?, description = ?
      WHERE line_id = ?
    `;

    const params = [
      brand_id,
      name,
      is_interior || 0,
      coverage_rate ? parseFloat(coverage_rate) : null,
      drying_time || null,
      gloss_level || null,
      recommended_layers || null,
      description || null,
      lineId,
    ];

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy dòng sản phẩm để cập nhật!" });
    }
    res.json({ message: "Cập nhật dòng sản phẩm thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. XÓA DÒNG SƠN (MỚI)
router.delete("/delete/:id", async (req, res) => {
  const lineId = req.params.id;
  try {
    // Lưu ý đối chiếu chuẩn xác tên cột khóa chính dưới DB (line_id)
    const [result] = await db.execute(
      "DELETE FROM productlines WHERE line_id = ?",
      [lineId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy dòng sản phẩm để xóa!" });
    }
    res.json({ message: "Đã xóa dòng sản phẩm thành công!" });
  } catch (err) {
    // Phòng trường hợp dòng sơn này đang chứa các sản phẩm sơn/biến thể cụ thể (ràng buộc khóa ngoại)
    res.status(500).json({
      error:
        "Không thể xóa dòng sản phẩm này vì đang có các biến thể/sản phẩm thuộc dòng sơn này!" ||
        err.message,
    });
  }
});

module.exports = router;
