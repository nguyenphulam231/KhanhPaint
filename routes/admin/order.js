const express = require("express");
const router = express.Router();
const db = require("../../db");
const { autoAssignStaffForOrder } = require("./assignStaff");

console.log("===> ĐÃ NẠP FILE ROUTES/ADMIN/ORDER.JS THÀNH CÔNG! <===");

// =========================================================================
// HELPER FUNCTIONS: XỬ LÝ TRỪ VÀ HOÀN KHO (TÍNH CẢ SƠN NỀN & TINH MÀU)
// =========================================================================

// Hàm kiểm tra và trừ kho khi tạo đơn hoặc mở lại đơn bị từ chối
// Đồng thời tính luôn giá vốn thực tế (sơn nền + tinh màu) của từng item,
// để KHÔNG phụ thuộc vào item.price do client gửi lên (tránh sai/giả mạo giá).
// Trả về: { itemCosts } - mảng { variant_id, color_id, quantity, unit_cost, line_total }
async function deductInventory(connection, items) {
  const itemCosts = [];

  for (const item of items) {
    // 1. Kiểm tra và khóa dòng dữ liệu sơn nền (Base Paint), lấy luôn giá vốn
    const [variantRows] = await connection.query(
      "SELECT stock_quantity, sku_code, unit_price FROM productvariants WHERE variant_id = ? FOR UPDATE",
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
        `Sản phẩm [SKU: ${variant.sku_code}] không đủ hàng trong kho (Hiện còn: ${variant.stock_quantity}).`,
      );
    }

    // 2. Kiểm tra và khóa dòng dữ liệu các tinh màu cấu thành (Colorants), lấy luôn đơn giá/ml
    const [colorantRows] = await connection.query(
      `SELECT cc.colorant_id, cc.amount_ml, c.colorant_name, c.stock_ml, c.unit_price_per_ml 
       FROM colorsystem_colorants cc
       JOIN colorants c ON cc.colorant_id = c.colorant_id
       WHERE cc.color_id = ? FOR UPDATE`,
      [parseInt(item.color_id)],
    );

    let colorantCostPerUnit = 0;
    for (const col of colorantRows) {
      const requiredMl = parseFloat(col.amount_ml) * parseInt(item.quantity);
      if (parseFloat(col.stock_ml) < requiredMl) {
        throw new Error(
          `Tinh màu [${col.colorant_name}] không đủ để pha màu đơn hàng này (Cần: ${requiredMl}ml, Hiện có: ${col.stock_ml}ml).`,
        );
      }
      colorantCostPerUnit +=
        parseFloat(col.amount_ml) * parseFloat(col.unit_price_per_ml);
    }

    // 3. Tiến hành trừ kho sơn nền
    await connection.query(
      "UPDATE productvariants SET stock_quantity = stock_quantity - ? WHERE variant_id = ?",
      [parseInt(item.quantity), parseInt(item.variant_id)],
    );

    // 4. Tiến hành trừ kho tinh màu
    for (const col of colorantRows) {
      const requiredMl = parseFloat(col.amount_ml) * parseInt(item.quantity);
      await connection.query(
        "UPDATE colorants SET stock_ml = stock_ml - ? WHERE colorant_id = ?",
        [requiredMl, col.colorant_id],
      );
    }

    // 5. Tính giá vốn thực tế cho 1 đơn vị sản phẩm = giá sơn nền + tổng tinh màu cấu thành
    // (dùng cho price_at_sale - giá bán cho khách, không liên quan chiết khấu hãng)
    const unitCost = parseFloat(variant.unit_price) + colorantCostPerUnit;
    itemCosts.push({
      variant_id: parseInt(item.variant_id),
      color_id: parseInt(item.color_id),
      quantity: parseInt(item.quantity),
      unit_cost: unitCost,
      line_total: unitCost * parseInt(item.quantity),
      // Chi phí tinh màu/1 đơn vị (đại lý tự mua đứt) - dùng để cộng thêm vào
      // cost_price_at_sale mà trigger before_orderdetails_insert đã tự tính
      // sẵn cho phần sơn nền (theo chiết khấu hãng), vì trigger không biết
      // về chi phí tinh màu.
      colorant_cost_per_unit: colorantCostPerUnit,
    });
  }

  return itemCosts;
}

// Hàm hoàn lại kho khi đơn hàng bị hủy (từ chối) hoặc bị xóa khỏi hệ thống
async function restoreInventory(connection, items) {
  for (const item of items) {
    // 1. Hoàn kho sơn nền
    await connection.query(
      "UPDATE productvariants SET stock_quantity = stock_quantity + ? WHERE variant_id = ?",
      [parseInt(item.quantity), parseInt(item.variant_id)],
    );

    // 2. Lấy công thức phối màu để hoàn kho tinh màu tương ứng
    const [colorantRows] = await connection.query(
      "SELECT colorant_id, amount_ml FROM colorsystem_colorants WHERE color_id = ?",
      [parseInt(item.color_id)],
    );

    for (const col of colorantRows) {
      const restoredMl = parseFloat(col.amount_ml) * parseInt(item.quantity);
      await connection.query(
        "UPDATE colorants SET stock_ml = stock_ml + ? WHERE colorant_id = ?",
        [restoredMl, col.colorant_id],
      );
    }
  }
}

// =========================================================================
// 1. TẠO ĐƠN HÀNG MỚI (Tự động trừ kho, rollback nếu thiếu hàng)
// =========================================================================
router.post("/add", async (req, res) => {
  const { customer_id, ward_id, street_address, items } = req.body;

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Vui lòng chọn khách hàng và ít nhất 1 sản phẩm hợp lệ!",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Validate cấu trúc cơ bản của từng item (KHÔNG còn dựa vào item.price nữa,
    // giá sẽ được backend tự tính từ DB ở bước deductInventory bên dưới)
    for (const item of items) {
      if (!item.variant_id || !item.color_id || isNaN(item.quantity)) {
        throw new Error(
          "Cấu trúc thông tin sản phẩm hoặc mã màu trong giỏ hàng không hợp lệ.",
        );
      }
    }

    // Thực hiện trừ kho sơn nền và tinh màu, đồng thời tính giá vốn thực tế
    // (sơn nền + tinh màu) cho từng item dựa trên dữ liệu thật trong DB.
    // (Nếu thiếu hàng sẽ throw lỗi nhảy vào catch)
    const itemCosts = await deductInventory(connection, items);

    // Tổng tiền đơn hàng = tổng giá vốn (sơn nền + tinh màu) của tất cả item,
    // không tin vào item.price do client gửi lên.
    const totalAmount = itemCosts.reduce((sum, ic) => sum + ic.line_total, 0);

    // Xác định ca làm việc & nhân viên gán tự động
    const { shift_id, sales_rep_id, tech_id } =
      await autoAssignStaffForOrder(connection);

    // Chèn dữ liệu vào bảng `orders` (Mặc định trạng thái ban đầu là 'chưa duyệt')
    const orderQuery = `
      INSERT INTO orders (customer_id, sales_rep_id, tech_id, shift_id, total_amount, status, street_address, ward_id)
      VALUES (?, ?, ?, ?, ?, 'chưa duyệt', ?, ?)
    `;
    const [orderResult] = await connection.query(orderQuery, [
      parseInt(customer_id),
      sales_rep_id,
      tech_id,
      shift_id,
      totalAmount,
      street_address || null,
      ward_id ? parseInt(ward_id) : null,
    ]);

    const newOrderId = orderResult.insertId;

    // Chèn danh sách sản phẩm chi tiết vào bảng `orderdetails`
    // price_at_sale ở đây là giá vốn thực tế (unit_cost) đã tính từ DB,
    // không còn lấy từ item.price do client gửi lên.
    //
    // LƯU Ý: bảng orderdetails có trigger `before_orderdetails_insert` tự động
    // gán cost_price_at_sale = unit_price (sơn nền) * (1 - discount_percentage/100)
    // khi INSERT. Trigger này KHÔNG biết về chi phí tinh màu, nên ngay sau khi
    // insert, ta UPDATE cộng thêm phần chi phí tinh màu (đại lý tự mua, không
    // chiết khấu hãng) vào cost_price_at_sale mà trigger vừa tính.
    const detailQuery = `
      INSERT INTO orderdetails (order_id, variant_id, color_id, quantity, price_at_sale)
      VALUES (?, ?, ?, ?, ?)
    `;

    const addColorantCostQuery = `
      UPDATE orderdetails
      SET cost_price_at_sale = cost_price_at_sale + ?
      WHERE order_id = ? AND variant_id = ? AND color_id = ?
    `;

    for (const ic of itemCosts) {
      await connection.query(detailQuery, [
        newOrderId,
        ic.variant_id,
        ic.color_id,
        ic.quantity,
        ic.unit_cost,
      ]);

      // Cộng thêm chi phí tinh màu (cho toàn bộ quantity của dòng này) vào
      // cost_price_at_sale mà trigger đã tự tính sẵn cho phần sơn nền.
      const colorantCostTotal = ic.colorant_cost_per_unit * ic.quantity;
      await connection.query(addColorantCostQuery, [
        colorantCostTotal,
        newOrderId,
        ic.variant_id,
        ic.color_id,
      ]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Tạo đơn hàng và trừ tồn kho thành công!",
      order_id: newOrderId,
      total_amount: totalAmount,
      assigned: { shift_id, sales_rep_id, tech_id },
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ [Lỗi Tạo Đơn] Không thể tạo đơn hàng:", err);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// =========================================================================
// 2. LẤY DANH SÁCH TOÀN BỘ ĐƠN HÀNG (Đã sửa lỗi Unknown column 'pv.cost_price')
// =========================================================================
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*, 
        c.name AS customer_name,
        e1.full_name AS sales_rep_name,
        e2.full_name AS tech_name,
        s.shift_name,
        w.ward_name,
        p.province_name,
        IFNULL(order_cost.total_cost, 0) AS total_cost
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN employees e1 ON o.sales_rep_id = e1.employee_id
      LEFT JOIN employees e2 ON o.tech_id = e2.employee_id
      LEFT JOIN shifts s ON o.shift_id = s.shift_id
      LEFT JOIN wards w ON o.ward_id = w.ward_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      
      /* Subquery gom nhóm và tính tổng tiền vốn trực tiếp từ bảng orderdetails */
      LEFT JOIN (
        SELECT order_id,
               SUM(cost_price_at_sale * quantity) AS total_cost
        FROM orderdetails
        GROUP BY order_id
      ) order_cost ON o.order_id = order_cost.order_id
      
      ORDER BY o.order_id DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 3. CHUYỂN ĐỔI TRẠNG THÁI NHANH (Xử lý thông minh việc hoàn/trừ kho)
// =========================================================================
router.put("/status/:id", async (req, res) => {
  const orderId = req.params.id;
  const { status: newStatus } = req.body;

  const validStatuses = ["chưa duyệt", "đã duyệt", "đã giao", "từ chối"];
  if (!validStatuses.includes(newStatus)) {
    return res
      .status(400)
      .json({ success: false, error: "Trạng thái không hợp lệ!" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lấy trạng thái hiện tại của đơn hàng
    const [orderRows] = await connection.query(
      "SELECT status FROM orders WHERE order_id = ? FOR UPDATE",
      [orderId],
    );

    if (orderRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy đơn hàng!" });
    }

    const oldStatus = orderRows[0].status;

    // Chỉ thực hiện xử lý kho nếu trạng thái có sự thay đổi thực sự
    if (oldStatus !== newStatus) {
      // Lấy chi tiết các mặt hàng trong đơn
      const [items] = await connection.query(
        "SELECT variant_id, color_id, quantity FROM orderdetails WHERE order_id = ?",
        [orderId],
      );

      // TRƯỜNG HỢP 1: Chuyển TỪ trạng thái bình thường SANG "từ chối" -> Hoàn kho
      if (oldStatus !== "từ chối" && newStatus === "từ chối") {
        await restoreInventory(connection, items);
      }
      // TRƯỜNG HỢP 2: Chuyển TỪ "từ chối" QUAY LẠI các trạng thái khác -> Tiếp tục trừ kho
      else if (oldStatus === "từ chối" && newStatus !== "từ chối") {
        await deductInventory(connection, items); // Sẽ kiểm tra kho, nếu không đủ sẽ báo lỗi
      }
    }

    // Cập nhật trạng thái mới vào Database
    await connection.query("UPDATE orders SET status = ? WHERE order_id = ?", [
      newStatus,
      orderId,
    ]);

    await connection.commit();
    res.json({
      success: true,
      message: `Chuyển trạng thái sang "${newStatus}" và cập nhật kho thành công!`,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ [Lỗi Cập Nhật Trạng Thái]:", err);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// =========================================================================
// 4. CHỈNH SỬA CHI TIẾT PHÂN BỔ ĐƠN HÀNG (Đồng bộ xử lý kho nếu đổi trạng thái)
// =========================================================================
router.put("/update/:id", async (req, res) => {
  const orderId = req.params.id;
  const {
    sales_rep_id,
    tech_id,
    shift_id,
    street_address,
    ward_id,
    total_amount,
    status: newStatus,
  } = req.body;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      "SELECT status FROM orders WHERE order_id = ? FOR UPDATE",
      [orderId],
    );

    if (orderRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy đơn hàng cần sửa!" });
    }

    const oldStatus = orderRows[0].status;

    // Xử lý biến động kho dựa trên thay đổi trạng thái trong API update tổng thể
    if (newStatus && oldStatus !== newStatus) {
      const [items] = await connection.query(
        "SELECT variant_id, color_id, quantity FROM orderdetails WHERE order_id = ?",
        [orderId],
      );

      if (oldStatus !== "từ chối" && newStatus === "từ chối") {
        await restoreInventory(connection, items);
      } else if (oldStatus === "từ chối" && newStatus !== "từ chối") {
        await deductInventory(connection, items);
      }
    }

    const query = `
      UPDATE orders 
      SET sales_rep_id = ?, tech_id = ?, shift_id = ?, street_address = ?, ward_id = ?, total_amount = ?, status = ?
      WHERE order_id = ?
    `;
    const params = [
      sales_rep_id || null,
      tech_id || null,
      shift_id || null,
      street_address || null,
      ward_id || null,
      parseFloat(total_amount) || 0,
      newStatus || oldStatus,
      orderId,
    ];

    await connection.query(query, params);

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật chi tiết đơn hàng và đồng bộ kho thành công!",
    });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(400).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// =========================================================================
// 5. XÓA ĐƠN HÀNG HOÀN TOÀN (Hoàn kho nếu đơn đó chưa ở trạng thái 'từ chối')
// =========================================================================
router.delete("/delete/:id", async (req, res) => {
  const orderId = req.params.id;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Kiểm tra trạng thái đơn trước khi xóa
    const [orderRows] = await connection.query(
      "SELECT status FROM orders WHERE order_id = ? FOR UPDATE",
      [orderId],
    );

    if (orderRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy đơn hàng để xóa!" });
    }

    const currentStatus = orderRows[0].status;

    // Nếu đơn hàng chưa ở trạng thái "từ chối" (nghĩa là hàng vẫn đang bị trừ trong kho), ta phải hoàn kho trước khi xóa hẳn đơn.
    if (currentStatus !== "từ chối") {
      const [items] = await connection.query(
        "SELECT variant_id, color_id, quantity FROM orderdetails WHERE order_id = ?",
        [orderId],
      );
      await restoreInventory(connection, items);
    }

    // Tiến hành xóa đơn hàng (Bảng orderdetails tự động xóa theo nhờ ON DELETE CASCADE)
    await connection.query("DELETE FROM orders WHERE order_id = ?", [orderId]);

    await connection.commit();
    res.json({
      success: true,
      message: "Đã xóa đơn hàng và hoàn lại số lượng kho thành công!",
    });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// =========================================================================
// 6. LẤY CHI TIẾT CÁC MẶT HÀNG CỦA MỘT ĐƠN HÀNG (Sơn, Base, Thể tích, Mã màu)
// =========================================================================
router.get("/:id/details", async (req, res) => {
  const orderId = req.params.id;
  try {
    const query = `
      SELECT 
        od.variant_id,
        od.color_id,
        od.quantity,
        od.price_at_sale,
        pv.sku_code,
        pv.volume,
        pl.name AS product_line_name,
        bt.base_name,
        cs.color_code,
        cs.color_name
      FROM orderdetails od
      JOIN productvariants pv ON od.variant_id = pv.variant_id
      JOIN productlines pl ON pv.line_id = pl.line_id
      JOIN basetypes bt ON pv.base_id = bt.base_id
      JOIN colorsystem cs ON od.color_id = cs.color_id
      WHERE od.order_id = ?
    `;
    const [rows] = await db.execute(query, [orderId]);
    res.json(rows);
  } catch (err) {
    console.error("❌ [Lỗi Lấy Chi Tiết Đơn Hàng]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
