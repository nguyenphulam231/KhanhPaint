const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. API LẤY DỮ LIỆU THỐNG KÊ (Đã cập nhật Giá vốn & Lợi nhuận chuẩn)
router.get("/", async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    const now = new Date();
    if (!startDate) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    }
    if (!endDate) {
      endDate = now.toISOString().split("T")[0];
    }

    // [CŨ] Query tính tổng doanh thu (Giá bán cho khách)
    const revenueQuery = `
      SELECT SUM(total_amount) AS total_revenue 
      FROM \`orders\` 
      WHERE DATE(created_at) BETWEEN ? AND ? AND status != 'CANCELLED'
    `;

    // [MỚI] Query tính tổng giá vốn hàng bán (Tiền gốc trả cho hãng sơn)
    const cogsQuery = `
      SELECT SUM(od.quantity * od.cost_price_at_sale) AS total_cogs
      FROM \`orderdetails\` od
      JOIN \`orders\` o ON od.order_id = o.order_id
      WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status != 'CANCELLED'
    `;

    const topProductQuery = `
      SELECT pl.name AS line_name, pv.volume, c.color_name, SUM(od.quantity) AS total_qty
      FROM \`orderdetails\` od
      JOIN \`orders\` o ON od.order_id = o.order_id
      JOIN \`productvariants\` pv ON od.variant_id = pv.variant_id
      JOIN \`productlines\` pl ON pv.line_id = pl.line_id
      JOIN \`colorsystem\` c ON od.color_id = c.color_id
      WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status != 'CANCELLED'
      GROUP BY pv.variant_id, pl.name, pv.volume, c.color_name
      ORDER BY total_qty DESC LIMIT 1
    `;

    const topBrandQuery = `
      SELECT b.name AS brand_name, SUM(od.quantity) AS total_qty
      FROM \`orderdetails\` od
      JOIN \`orders\` o ON od.order_id = o.order_id
      JOIN \`productvariants\` pv ON od.variant_id = pv.variant_id
      JOIN \`productlines\` pl ON pv.line_id = pl.line_id
      JOIN \`brands\` b ON pl.brand_id = b.brand_id
      WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status != 'CANCELLED'
      GROUP BY b.brand_id, b.name
      ORDER BY total_qty DESC LIMIT 1
    `;

    const payrollQuery = `
      SELECT SUM((TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time)) / 3600) * e.salary) AS total_payroll
      FROM \`employees_shifts\` es
      JOIN \`employees\` e ON es.employee_id = e.employee_id
      JOIN \`shifts\` s ON es.shift_id = s.shift_id
      WHERE es.working_date BETWEEN ? AND ?
    `;

    const otherFinancialQuery = `
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS total_other_income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS total_other_expense
      FROM \`financial_logs\`
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;

    // Thực thi đồng thời cả 6 câu lệnh truy vấn (Thêm cogsQuery)
    const [
      [revenueResult],
      [cogsResult],
      [productResult],
      [brandResult],
      [payrollResult],
      [financialResult],
    ] = await Promise.all([
      db.query(revenueQuery, [startDate, endDate]),
      db.query(cogsQuery, [startDate, endDate]),
      db.query(topProductQuery, [startDate, endDate]),
      db.query(topBrandQuery, [startDate, endDate]),
      db.query(payrollQuery, [startDate, endDate]),
      db.query(otherFinancialQuery, [startDate, endDate]),
    ]);

    const totalRevenue = Number(revenueResult[0]?.total_revenue || 0);
    const totalCogs = Number(cogsResult[0]?.total_cogs || 0); // Lấy tổng giá vốn
    const estimatedPayroll = Math.round(
      Number(payrollResult[0]?.total_payroll || 0),
    );

    const totalOtherIncome = Number(
      financialResult[0]?.total_other_income || 0,
    );
    const totalOtherExpense = Number(
      financialResult[0]?.total_other_expense || 0,
    );

    // --- CÔNG THỨC TÍNH LỢI NHUẬN CHUẨN ---
    // Lợi nhuận gộp từ bán sơn
    const grossProfit = totalRevenue - totalCogs;
    // Lợi nhuận ròng thực tế sau khi tính thêm thu/chi ngoài và lương nhân viên
    const netProfit =
      grossProfit + totalOtherIncome - estimatedPayroll - totalOtherExpense;

    const topProductInfo = productResult[0]
      ? `${productResult[0].line_name} (${productResult[0].volume}) - Màu ${productResult[0].color_name} <br><small>(${productResult[0].total_qty} lon)</small>`
      : "Chưa có đơn hàng";

    const topBrandInfo = brandResult[0]
      ? `${brandResult[0].brand_name} <br><small>(${brandResult[0].total_qty} lon)</small>`
      : "Chưa có đơn hàng";

    res.json({
      message: "Lấy dữ liệu thống kê thành công",
      data: {
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalCogs, // Trả thêm trường này ra FE nếu muốn hiển thị tổng tiền vốn
          grossProfit, // Lợi nhuận gộp từ hoạt động bán hàng
          estimatedPayroll,
          totalOtherIncome,
          totalOtherExpense,
          netProfit, // Lợi nhuận ròng cuối cùng
          topProduct: topProductInfo,
          topBrand: topBrandInfo,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. API THÊM MỚI KHOẢN THU/CHI PHÁT SINH (Đã sửa tên bảng thành financial_logs)
router.post("/record", async (req, res) => {
  const { type, amount, description } = req.body;

  if (!type || !amount || !description || description.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin bắt buộc.",
    });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Số tiền phải là số lớn hơn 0." });
  }

  try {
    // Sửa đổi từ financial_records thành financial_logs để khớp với DB đã tạo
    const sql =
      "INSERT INTO \`financial_logs\` (type, amount, description) VALUES (?, ?, ?)";
    await db.execute(sql, [type, amount, description.trim()]);

    res
      .status(201)
      .json({ success: true, message: "Ghi nhận khoản tài chính thành công!" });
  } catch (error) {
    console.error("Lỗi thêm khoản tài chính:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi lưu khoản thu/chi." });
  }
});

// 3. API LẤY DANH SÁCH CÁC KHOẢN THU/CHI TRONG KỲ LỌC
router.get("/records", async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    const now = new Date();
    if (!startDate)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    if (!endDate) endDate = now.toISOString().split("T")[0];

    const sql = `
      SELECT log_id, type, amount, description, DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS date_formatted
      FROM \`financial_logs\`
      WHERE DATE(created_at) BETWEEN ? AND ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, [startDate, endDate]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. API XÓA MỘT KHOẢN THU/CHI
router.delete("/record/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute("DELETE FROM \`financial_logs\` WHERE log_id = ?", [id]);
    res.json({ success: true, message: "Xóa khoản tài chính thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. API CẬP NHẬT (SỬA) MỘT KHOẢN THU/CHI
router.put("/record/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description } = req.body;

    if (
      !type ||
      !amount ||
      !description ||
      description.trim() === "" ||
      isNaN(amount) ||
      Number(amount) <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không hợp lệ." });
    }

    const sql =
      "UPDATE \`financial_logs\` SET type = ?, amount = ?, description = ? WHERE log_id = ?";
    await db.execute(sql, [type, amount, description.trim(), id]);
    res.json({
      success: true,
      message: "Cập nhật khoản tài chính thành công!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
