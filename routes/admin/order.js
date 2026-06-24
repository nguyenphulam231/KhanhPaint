const express = require("express");
const router = express.Router();
const db = require("../../db");

// TẠO ĐƠN HÀNG MỚI (Sử dụng Transaction an toàn)
router.post("/add", async (req, res) => {
  // Nhận ward_id và street_address từ giao diện nâng cao của frontend
  const { customer_id, ward_id, street_address, items } = req.body;

  // 1. Kiểm tra và validate dữ liệu sớm để tiết kiệm tài nguyên kết nối DB
  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Vui lòng chọn khách hàng và ít nhất 1 sản phẩm hợp lệ!",
      });
  }

  // Khai báo biến connection bên ngoài để khối catch và finally có thể truy cập
  let connection;

  try {
    // 2. Lấy connection bên trong khối try-catch để bắt lỗi nếu DB "sập" hoặc hết pool
    connection = await db.getConnection();

    // Kích hoạt Transaction
    await connection.beginTransaction();

    // 3. Tính toán tổng tiền đơn hàng và kiểm tra cấu trúc từng item
    let totalAmount = 0;
    for (const item of items) {
      if (!item.variant_id || isNaN(item.price) || isNaN(item.quantity)) {
        throw new Error(
          "Cấu trúc thông tin sản phẩm trong giỏ hàng không hợp lệ.",
        );
      }
      totalAmount += parseFloat(item.price) * parseInt(item.quantity);
    }

    // 4. Chèn dữ liệu vào bảng `orders`
    const orderQuery = `
      INSERT INTO orders (customer_id, total_amount, status, street_address, ward_id)
      VALUES (?, ?, 'Chờ xử lý', ?, ?)
    `;
    const [orderResult] = await connection.query(orderQuery, [
      parseInt(customer_id),
      totalAmount,
      street_address || null,
      ward_id ? parseInt(ward_id) : null,
    ]);

    const newOrderId = orderResult.insertId;

    // 5. Chèn danh sách sản phẩm chi tiết vào bảng `orderdetails`
    const detailQuery = `
      INSERT INTO orderdetails (order_id, variant_id, color_id, quantity, price_at_sale)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      await connection.query(detailQuery, [
        newOrderId,
        parseInt(item.variant_id),
        item.color_id ? parseInt(item.color_id) : null,
        parseInt(item.quantity),
        parseFloat(item.price),
      ]);
    }

    // Cam kết hoàn thành toàn bộ Transaction thành công
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Tạo đơn hàng thành công!",
      order_id: newOrderId,
    });
  } catch (err) {
    // Chỉ thực hiện rollback nếu connection đã được thiết lập thành công
    if (connection) {
      await connection.rollback();
    }
    console.error("❌ [Lỗi Hệ Thống] Không thể tạo đơn hàng:", err);
    res
      .status(500)
      .json({ success: false, error: "Lỗi hệ thống: " + err.message });
  } finally {
    // Chỉ giải phóng connection về pool nếu nó tồn tại để tránh gây lỗi crash app phụ
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
