const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [[employeeStats]] = await db.query("SELECT COUNT(*) AS total_employees FROM employees");
    const [[customerStats]] = await db.query("SELECT COUNT(*) AS total_customers FROM customers");
    const [[orderStats]] = await db.query(
      "SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE status <> 'cancelled'"
    );
    const [[lowProductStats]] = await db.query(
      "SELECT COUNT(*) AS low_stock_products FROM productvariants WHERE stock_quantity <= 5"
    );
    const [[lowColorantStats]] = await db.query(
      "SELECT COUNT(*) AS low_stock_colorants FROM colorants WHERE stock_ml <= 500"
    );
    const [[debtStats]] = await db.query(
      "SELECT COALESCE(SUM(current_debt), 0) AS total_debt FROM customers"
    );

    res.json({
      message: "Chào mừng Admin",
      data: {
        total_employees: employeeStats.total_employees,
        total_customers: customerStats.total_customers,
        total_orders: orderStats.total_orders,
        total_revenue: Number(orderStats.total_revenue),
        low_stock_products: lowProductStats.low_stock_products,
        low_stock_colorants: lowColorantStats.low_stock_colorants,
        total_debt: Number(debtStats.total_debt),
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Lỗi tải dashboard." });
  }
});

module.exports = router;
