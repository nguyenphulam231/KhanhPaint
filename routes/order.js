const express = require("express");
const router = express.Router();
const db = require("../db");
// Nhúng middleware bảo mật
const authMiddleware = require("../middleware/authMiddleware");

// Lấy danh sách đơn hàng của riêng khách hàng đã đăng nhập
// SỬA: Dùng authMiddleware.authenticate
router.get("/my-orders", authMiddleware.authenticate, async (req, res) => {
  try {
    // req.user.id được lấy từ token sau khi qua authMiddleware
    const [rows] = await db.query(
      "SELECT * FROM Orders WHERE customer_id = ?",
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo đơn hàng mới (Cần đăng nhập)
// SỬA: Dùng authMiddleware.authenticate
router.post("/", authMiddleware.authenticate, async (req, res) => {
  const { sales_rep_id, tech_id, total_amount, items } = req.body;
  const customer_id = req.user.id; // Lấy ID khách hàng từ token

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert vào bảng Orders
    const [orderResult] = await connection.query(
      "INSERT INTO Orders (customer_id, sales_rep_id, tech_id, total_amount, status) VALUES (?, ?, ?, ?, 'Pending')",
      [customer_id, sales_rep_id, tech_id, total_amount],
    );
    const orderId = orderResult.insertId;

    // 2. Insert chi tiết vào OrderDetails và trừ kho
    for (let item of items) {
      // Lưu chi tiết đơn hàng
      await connection.query(
        "INSERT INTO OrderDetails (order_id, variant_id, color_id, quantity, price_at_sale) VALUES (?, ?, ?, ?, ?)",
        [orderId, item.variant_id, item.color_id, item.quantity, item.price],
      );

      // Trừ kho (Lưu ý: Tên bảng của bạn là ProductVariants, hãy kiểm tra lại nếu lỗi)
      await connection.query(
        "UPDATE ProductVariants SET stock_quantity = stock_quantity - ? WHERE variant_id = ?",
        [item.quantity, item.variant_id],
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Tạo đơn thành công!", orderId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Lỗi hệ thống: " + error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
