const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách toàn bộ hãng sơn để hiển thị ở trang chủ
router.get("/brands", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM brands ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy danh sách hãng: " + err.message });
  }
});

// 2. Lấy các dòng sơn thuộc một hãng (dùng để bỏ vào dropdown lọc)
router.get("/brands/:brandId/lines", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM productlines WHERE brand_id = ?",
      [req.params.brandId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy dòng sơn: " + err.message });
  }
});

// 3. API QUAN TRỌNG: Lấy danh sách biến thể theo Hãng + Bộ lọc
//    Hỗ trợ thêm: lọc theo color_id (server tự suy ra base_id từ màu được chọn
//    để tránh client tự gửi base_id sai/giả mạo) và lọc theo volume (1, 5, 20).
router.get("/brands/:brandId/variants", async (req, res) => {
  const { line_id, is_interior, search, color_id, volume } = req.query;
  const brandId = req.params.brandId;

  let conditions = ["pl.brand_id = ?"];
  let params = [brandId];

  if (line_id) {
    conditions.push("pl.line_id = ?");
    params.push(line_id);
  }
  if (is_interior !== undefined && is_interior !== "") {
    conditions.push("pl.is_interior = ?");
    params.push(is_interior);
  }
  if (search) {
    conditions.push("(pl.name LIKE ? OR pv.volume LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (volume) {
    conditions.push("pv.volume = ?");
    params.push(volume);
  }

  // Nếu có color_id, suy ra base_id tương ứng từ bảng colorsystem rồi lọc
  // biến thể theo đúng base đó (KHÔNG tin base_id do client tự gửi lên).
  if (color_id) {
    conditions.push(
      "pv.base_id = (SELECT base_id FROM colorsystem WHERE color_id = ?)",
    );
    params.push(color_id);
  }

  const whereClause = "WHERE " + conditions.join(" AND ");

  try {
    const query = `
      SELECT 
        pv.variant_id, pv.line_id, pv.base_id, pv.volume, pv.unit_price, pv.stock_quantity,
        pl.name AS line_name, pl.is_interior, pl.coverage_rate, pl.drying_time, pl.recommended_layers
      FROM productvariants pv
      JOIN productlines pl ON pv.line_id = pl.line_id
      ${whereClause}
      ORDER BY pl.name ASC, pv.volume DESC
    `;
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Lỗi lấy danh sách biến thể sơn: " + err.message });
  }
});

// 3b. Lấy danh sách thể tích thực sự đang tồn tại trong DB cho một hãng
//     (dùng để đổ vào dropdown lọc thể tích, tránh hard-code nếu sau này
//     có thêm dung tích khác ngoài 1, 5, 20).
router.get("/brands/:brandId/volumes", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT pv.volume
       FROM productvariants pv
       JOIN productlines pl ON pv.line_id = pl.line_id
       WHERE pl.brand_id = ?
       ORDER BY pv.volume ASC`,
      [req.params.brandId],
    );
    res.json(rows.map((r) => r.volume));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Lỗi lấy danh sách thể tích: " + err.message });
  }
});

// 3c. Lấy chi tiết nhiều biến thể theo danh sách variant_id (dùng cho trang
//     giỏ hàng: localStorage chỉ lưu variant_id/color_id/quantity, cần API
//     này để hiển thị đầy đủ tên dòng sơn, hãng, đơn giá, tồn kho hiện tại...)
router.get("/variants-by-ids", async (req, res) => {
  const { ids } = req.query; // ids dạng "1,2,3"
  if (!ids) return res.json([]);

  const idList = ids
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  if (idList.length === 0) return res.json([]);

  try {
    const placeholders = idList.map(() => "?").join(",");
    const query = `
      SELECT 
        pv.variant_id, pv.line_id, pv.base_id, pv.volume, pv.unit_price, pv.stock_quantity,
        pl.name AS line_name, pl.is_interior,
        b.name AS brand_name
      FROM productvariants pv
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN brands b ON pl.brand_id = b.brand_id
      WHERE pv.variant_id IN (${placeholders})
    `;
    const [rows] = await db.execute(query, idList);
    res.json(rows);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Lỗi lấy chi tiết biến thể: " + err.message });
  }
});

// 4. Lấy toàn bộ bảng màu
router.get("/colors", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM colorsystem");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy bảng màu: " + err.message });
  }
});

// GET /api/client/products/colorant-cost?color_id=2&volume=5
// Tính chi phí tinh màu cho 1 thùng sơn theo color_id và dung tích (lít)
router.get("/colorant-cost", async (req, res) => {
  const { color_id, volume } = req.query;

  if (!color_id || !volume) {
    return res.status(400).json({ error: "Thiếu color_id hoặc volume!" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT SUM(cc.amount_ml * ? * c.unit_price_per_ml) AS colorant_cost
       FROM colorsystem_colorants cc
       JOIN colorants c ON cc.colorant_id = c.colorant_id
       WHERE cc.color_id = ?`,
      [parseFloat(volume), parseInt(color_id)],
    );

    const colorantCost = parseFloat(rows[0].colorant_cost) || 0;
    res.json({ colorant_cost: colorantCost });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Lỗi tính chi phí tinh màu: " + err.message });
  }
});

// 5. API CHO TRANG DỰ TOÁN SƠN: Lấy TOÀN BỘ variants của TẤT CẢ hãng
//    (không lọc theo brand_id), kèm đủ field base_id/is_interior/volume để
//    paint-estimator.html tự nhóm theo line và đối chiếu tồn kho.
//
//    LƯU Ý: đã bỏ điều kiện "WHERE b.is_active = 1" vì bảng brands trong DB
//    hiện tại không có cột is_active (gây lỗi 500 "Unknown column"). Nếu sau
//    này bạn thêm cột đánh dấu hãng còn hoạt động, thêm điều kiện WHERE lại
//    vào đây với đúng tên cột thực tế.
router.get("/variants-all", async (req, res) => {
  try {
    const query = `
      SELECT
        pv.variant_id,
        pv.sku_code,
        pv.volume,
        pv.unit_price,
        pv.stock_quantity,
        pv.base_id,
        bt.base_name,
        pv.line_id,
        pl.name        AS line_name,
        pl.is_interior,
        pl.drying_time,
        pl.recommended_layers,
        b.brand_id,
        b.name         AS brand_name
      FROM productvariants pv
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN brands b        ON pl.brand_id = b.brand_id
      JOIN basetypes bt     ON pv.base_id  = bt.base_id
      ORDER BY b.name, pl.name, pv.volume
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (err) {
    console.error("❌ [Lỗi /variants-all]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
