const express = require("express");
const router = express.Router();
const db = require("../../db");
const jwt = require("jsonwebtoken");
const { autoAssignStaffForOrder } = require("../admin/assignStaff");

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key_sieu_bi_mat";

// =========================================================================
// MIDDLEWARE: Xác thực JWT — lấy customer_id từ token, KHÔNG tin body
// =========================================================================
function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Bạn cần đăng nhập để thực hiện thao tác này!",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    if (!payload.id) {
      return res
        .status(401)
        .json({ success: false, error: "Token không hợp lệ!" });
    }
    req.customerId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Token hết hạn hoặc không hợp lệ!",
    });
  }
}

router.use(requireCustomerAuth);

async function loadCustomerOrders(customerId) {
  const [orders] = await db.execute(
    `SELECT
       o.order_id, o.total_amount, o.status,
       o.street_address, o.created_at,
       w.ward_name, p.province_name,
       sales.full_name AS sales_rep_name,
       tech.full_name  AS tech_name,
       s.shift_name
     FROM orders o
     LEFT JOIN wards w ON o.ward_id = w.ward_id
     LEFT JOIN provinces p ON w.province_id = p.province_id
     LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
     LEFT JOIN employees tech ON o.tech_id = tech.employee_id
     LEFT JOIN shifts s ON o.shift_id = s.shift_id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC`,
    [customerId],
  );

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.order_id);
  const placeholders = orderIds.map(() => "?").join(",");
  const [details] = await db.execute(
    `SELECT
       od.order_id,
       od.quantity,
       od.price_at_sale,
       cs.color_code,
       cs.color_name,
       bt.base_name,
       pv.sku_code,
       pv.volume,
       pl.name AS line_name,
       pl.is_interior,
       br.name AS brand_name
     FROM orderdetails od
     JOIN colorsystem cs ON od.color_id = cs.color_id
     JOIN basetypes bt ON cs.base_id = bt.base_id
     JOIN productvariants pv ON od.variant_id = pv.variant_id
     JOIN productlines pl ON pv.line_id = pl.line_id
     JOIN brands br ON pl.brand_id = br.brand_id
     WHERE od.order_id IN (${placeholders})
     ORDER BY od.order_id DESC, od.variant_id ASC, od.color_id ASC`,
    orderIds,
  );

  const detailsByOrder = {};
  details.forEach((detail) => {
    if (!detailsByOrder[detail.order_id]) {
      detailsByOrder[detail.order_id] = [];
    }
    detailsByOrder[detail.order_id].push(detail);
  });

  return orders.map((order) => ({
    ...order,
    items: detailsByOrder[order.order_id] || [],
  }));
}

// =========================================================================
// HELPER: Trừ kho sơn nền + tinh màu, tính giá bán & giá vốn thực tế
//
// amount_ml trong colorsystem_colorants = ml tinh màu cần cho 1 LÍT sơn.
// Mỗi thùng cần: amount_ml * volume (lít).
// Cả đơn cần:    amount_ml * volume * quantity.
//
// Trả về itemCosts[] để dùng khi INSERT orderdetails.
// =========================================================================
async function deductInventory(connection, items) {
  const itemCosts = [];

  for (const item of items) {
    // ------------------------------------------------------------------
    // 1. Kiểm tra & khóa sơn nền — lấy thêm volume để tính tinh màu
    // ------------------------------------------------------------------
    const [variantRows] = await connection.query(
      `SELECT stock_quantity, sku_code, unit_price,
              CAST(volume AS DECIMAL(10,2)) AS volume_liters
       FROM productvariants
       WHERE variant_id = ? FOR UPDATE`,
      [parseInt(item.variant_id)],
    );

    if (variantRows.length === 0) {
      throw new Error(
        `Sản phẩm với mã ID ${item.variant_id} không tồn tại trong hệ thống!`,
      );
    }

    const variant = variantRows[0];
    if (variant.stock_quantity < parseInt(item.quantity)) {
      throw new Error(
        `Sản phẩm [SKU: ${variant.sku_code}] không đủ hàng trong kho ` +
          `(Hiện còn: ${variant.stock_quantity}).`,
      );
    }

    // volume lưu dạng varchar "1", "5", "20" — ép sang số thực
    const volumeLiters = parseFloat(variant.volume_liters);

    // ------------------------------------------------------------------
    // 2. Kiểm tra & khóa tinh màu cấu thành
    // ------------------------------------------------------------------
    const [colorantRows] = await connection.query(
      `SELECT cc.colorant_id, cc.amount_ml,
              c.colorant_name, c.stock_ml, c.unit_price_per_ml
       FROM colorsystem_colorants cc
       JOIN colorants c ON cc.colorant_id = c.colorant_id
       WHERE cc.color_id = ? FOR UPDATE`,
      [parseInt(item.color_id)],
    );

    let colorantCostPerUnit = 0; // chi phí tinh màu cho 1 THÙNG

    for (const col of colorantRows) {
      // ml cần cho 1 thùng = amount_ml (ml/lít) * volume (lít/thùng)
      const mlPerUnit = parseFloat(col.amount_ml) * volumeLiters;
      // ml cần cho toàn bộ số thùng trong đơn
      const requiredMl = mlPerUnit * parseInt(item.quantity);

      if (parseFloat(col.stock_ml) < requiredMl) {
        throw new Error(
          `Tinh màu [${col.colorant_name}] không đủ để pha màu đơn hàng này ` +
            `(Cần: ${requiredMl.toFixed(2)}ml, Hiện có: ${parseFloat(col.stock_ml).toFixed(2)}ml).`,
        );
      }

      // Chi phí tinh màu cho 1 thùng = ml/thùng * đơn giá/ml
      colorantCostPerUnit += mlPerUnit * parseFloat(col.unit_price_per_ml);
    }

    // ------------------------------------------------------------------
    // 3. Trừ kho sơn nền
    // ------------------------------------------------------------------
    await connection.query(
      `UPDATE productvariants
       SET stock_quantity = stock_quantity - ?
       WHERE variant_id = ?`,
      [parseInt(item.quantity), parseInt(item.variant_id)],
    );

    // ------------------------------------------------------------------
    // 4. Trừ kho tinh màu — dùng lại mlPerUnit đã tính ở trên
    // ------------------------------------------------------------------
    for (const col of colorantRows) {
      const mlPerUnit = parseFloat(col.amount_ml) * volumeLiters;
      const requiredMl = mlPerUnit * parseInt(item.quantity);
      await connection.query(
        `UPDATE colorants
         SET stock_ml = stock_ml - ?
         WHERE colorant_id = ?`,
        [requiredMl, col.colorant_id],
      );
    }

    // ------------------------------------------------------------------
    // 5. Tổng hợp chi phí
    //    price_at_sale (giá bán cho khách) = giá sơn nền + chi phí tinh màu/thùng
    //    cost_price_at_sale (giá vốn đại lý) = trigger tự tính phần sơn nền
    //      theo chiết khấu hãng, rồi ta UPDATE cộng thêm chi phí tinh màu sau
    // ------------------------------------------------------------------
    const unitCost = parseFloat(variant.unit_price) + colorantCostPerUnit;

    itemCosts.push({
      variant_id: parseInt(item.variant_id),
      color_id: parseInt(item.color_id),
      quantity: parseInt(item.quantity),
      unit_cost: unitCost, // giá bán / thùng
      line_total: unitCost * parseInt(item.quantity),
      colorant_cost_per_unit: colorantCostPerUnit, // cộng vào cost_price_at_sale sau
    });
  }

  return itemCosts;
}

// =========================================================================
// HELPER: Hoàn kho — dùng khi đơn bị huỷ (để sẵn cho tính năng sau)
// Cũng phải nhân volume vì amount_ml tính trên lít.
// =========================================================================
async function restoreInventory(connection, items) {
  for (const item of items) {
    // Hoàn sơn nền
    await connection.query(
      `UPDATE productvariants
       SET stock_quantity = stock_quantity + ?
       WHERE variant_id = ?`,
      [parseInt(item.quantity), parseInt(item.variant_id)],
    );

    // Lấy volume của variant để tính lại ml tinh màu cần hoàn
    const [variantRows] = await connection.query(
      `SELECT CAST(volume AS DECIMAL(10,2)) AS volume_liters
       FROM productvariants WHERE variant_id = ?`,
      [parseInt(item.variant_id)],
    );
    const volumeLiters =
      variantRows.length > 0 ? parseFloat(variantRows[0].volume_liters) : 1; // fallback an toàn

    // Lấy công thức màu để hoàn tinh màu
    const [colorantRows] = await connection.query(
      `SELECT colorant_id, amount_ml
       FROM colorsystem_colorants
       WHERE color_id = ?`,
      [parseInt(item.color_id)],
    );

    for (const col of colorantRows) {
      const mlPerUnit = parseFloat(col.amount_ml) * volumeLiters;
      const restoredMl = mlPerUnit * parseInt(item.quantity);
      await connection.query(
        `UPDATE colorants
         SET stock_ml = stock_ml + ?
         WHERE colorant_id = ?`,
        [restoredMl, col.colorant_id],
      );
    }
  }
}

// =========================================================================
// POST /api/client/orders/add
// Tạo đơn hàng từ giỏ hàng — customer_id lấy từ JWT, KHÔNG từ body
// =========================================================================
router.post("/add", async (req, res) => {
  const { ward_id, street_address, items } = req.body;
  const customerId = req.customerId; // từ JWT middleware, tuyệt đối không dùng body

  // --- Validate đầu vào ---
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "Giỏ hàng trống, không thể đặt hàng!" });
  }
  if (!ward_id || !street_address || !street_address.trim()) {
    return res.status(400).json({
      success: false,
      error:
        "Vui lòng nhập đầy đủ địa chỉ giao hàng (phường/xã và địa chỉ cụ thể)!",
    });
  }
  for (const item of items) {
    if (
      !item.variant_id ||
      !item.color_id ||
      !item.quantity ||
      isNaN(parseInt(item.quantity)) ||
      parseInt(item.quantity) < 1
    ) {
      return res.status(400).json({
        success: false,
        error: "Thông tin sản phẩm trong giỏ hàng không hợp lệ.",
      });
    }
  }

  // --- Kiểm tra customer tồn tại & lấy thông tin công nợ ---
  const [customerRows] = await db.execute(
    `SELECT customer_id, credit_limit, current_debt FROM customers WHERE customer_id = ?`,
    [customerId],
  );
  if (customerRows.length === 0) {
    return res
      .status(403)
      .json({ success: false, error: "Tài khoản khách hàng không hợp lệ!" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Trừ kho sơn nền + tinh màu (nhân volume), tính giá từ DB
    const itemCosts = await deductInventory(connection, items);

    // Tổng tiền tính từ DB — không dùng bất kỳ giá nào client gửi lên
    const totalAmount = itemCosts.reduce((sum, ic) => sum + ic.line_total, 0);

    // Kiểm tra hạn mức công nợ (chỉ chặn nếu credit_limit đã được thiết lập > 0)
    const customer = customerRows[0];
    const newDebt = parseFloat(customer.current_debt) + totalAmount;
    if (
      parseFloat(customer.credit_limit) > 0 &&
      newDebt > parseFloat(customer.credit_limit)
    ) {
      throw new Error(
        `Đơn hàng vượt quá hạn mức công nợ cho phép ` +
          `(Hạn mức: ${parseFloat(customer.credit_limit).toLocaleString("vi-VN")} đ, ` +
          `Hiện đang nợ: ${parseFloat(customer.current_debt).toLocaleString("vi-VN")} đ).`,
      );
    }

    // Gán ca làm việc & nhân viên tự động (giống admin)
    const { shift_id, sales_rep_id, tech_id } =
      await autoAssignStaffForOrder(connection);

    // Tạo đơn hàng — mặc định "chưa duyệt"
    const [orderResult] = await connection.query(
      `INSERT INTO orders
         (customer_id, sales_rep_id, tech_id, shift_id, total_amount, status, street_address, ward_id)
       VALUES (?, ?, ?, ?, ?, 'chưa duyệt', ?, ?)`,
      [
        customerId,
        sales_rep_id,
        tech_id,
        shift_id,
        totalAmount,
        street_address.trim(),
        parseInt(ward_id),
      ],
    );

    const newOrderId = orderResult.insertId;

    // Chèn chi tiết sản phẩm vào orderdetails
    // Trigger before_orderdetails_insert tự tính cost_price_at_sale phần sơn nền
    // (unit_price * (1 - discount%)). Sau đó ta UPDATE cộng thêm chi phí tinh màu
    // vì trigger không biết về tinh màu — giống hệt logic admin/order.js.
    for (const ic of itemCosts) {
      await connection.query(
        `INSERT INTO orderdetails (order_id, variant_id, color_id, quantity, price_at_sale)
         VALUES (?, ?, ?, ?, ?)`,
        [newOrderId, ic.variant_id, ic.color_id, ic.quantity, ic.unit_cost],
      );

      // Chi phí tinh màu toàn bộ dòng = cost/thùng * số thùng
      const colorantCostTotal = ic.colorant_cost_per_unit * ic.quantity;
      await connection.query(
        `UPDATE orderdetails
         SET cost_price_at_sale = cost_price_at_sale + ?
         WHERE order_id = ? AND variant_id = ? AND color_id = ?`,
        [colorantCostTotal, newOrderId, ic.variant_id, ic.color_id],
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công! Đơn hàng đang chờ xét duyệt.",
      order_id: newOrderId,
      total_amount: totalAmount,
      assigned: { shift_id, sales_rep_id, tech_id },
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ [Lỗi Đặt Hàng Client]:", err.message);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// =========================================================================
// GET /api/client/orders/my
// Lịch sử đơn hàng của khách đang đăng nhập
// =========================================================================
router.get("/my", async (req, res) => {
  try {
    const rows = await loadCustomerOrders(req.customerId);
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// GET /api/client/orders/history
// Alias cho trang client mới
// =========================================================================
router.get("/history", async (req, res) => {
  try {
    const rows = await loadCustomerOrders(req.customerId);
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// GET /api/client/orders/my/:orderId
// Chi tiết 1 đơn hàng — chỉ cho xem nếu đúng chủ sở hữu
// =========================================================================
router.get("/my/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const [orderRows] = await db.execute(
      `SELECT
         o.order_id, o.total_amount, o.status,
         o.street_address, o.created_at,
         w.ward_name, p.province_name
       FROM orders o
       LEFT JOIN wards     w ON o.ward_id     = w.ward_id
       LEFT JOIN provinces p ON w.province_id = p.province_id
       WHERE o.order_id = ? AND o.customer_id = ?`,
      [parseInt(orderId), req.customerId],
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này!",
      });
    }

    const [detailRows] = await db.execute(
      `SELECT
         od.variant_id, od.color_id, od.quantity, od.price_at_sale,
         pv.volume, pv.sku_code,
         pl.name        AS line_name,
         pl.is_interior,
         b.name         AS brand_name,
         bt.base_name,
         cs.color_code, cs.color_name
       FROM orderdetails od
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       JOIN productlines    pl ON pv.line_id    = pl.line_id
       JOIN brands          b  ON pl.brand_id   = b.brand_id
       JOIN basetypes       bt ON pv.base_id    = bt.base_id
       JOIN colorsystem     cs ON od.color_id   = cs.color_id
       WHERE od.order_id = ?`,
      [parseInt(orderId)],
    );

    res.json({ success: true, order: orderRows[0], items: detailRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
