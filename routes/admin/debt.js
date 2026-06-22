const express = require("express");
const router = express.Router();
const db = require("../../db");

function cleanText(value) {
  return String(value || "").trim();
}

function likeTerm(value) {
  return `%${cleanText(value)}%`;
}

function toPositiveAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function toInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function isDbBusinessError(err) {
  return err && (err.sqlState === "45000" || err.code === "ER_CHECK_CONSTRAINT_VIOLATED");
}

function handleError(res, err, label) {
  console.error(label, err);
  if (isDbBusinessError(err) || err.statusCode) {
    return res.status(err.statusCode || 409).json({ error: err.message || "Dữ liệu công nợ không hợp lệ." });
  }
  return res.status(500).json({ error: "Lỗi xử lý công nợ." });
}

router.get("/summary", async (req, res) => {
  const search = cleanText(req.query.search);
  const status = cleanText(req.query.status);
  const params = [];
  let where = "WHERE 1 = 1";

  if (search) {
    where += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
    params.push(likeTerm(search), likeTerm(search), likeTerm(search));
  }

  if (status === "overdue") {
    where += " AND overdue_amount > 0";
  } else if (status === "debt") {
    where += " AND current_debt > 0";
  } else if (status === "near_limit") {
    where += " AND credit_limit > 0 AND current_debt >= credit_limit * 0.8";
  }

  try {
    const [rows] = await db.execute(
      `SELECT *
       FROM v_customer_debt_summary
       ${where}
       ORDER BY overdue_amount DESC, current_debt DESC, name`,
      params
    );
    res.json(rows);
  } catch (err) {
    handleError(res, err, "Debt summary error:");
  }
});

router.get("/overdue", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT *
       FROM v_overdue_debts
       ORDER BY days_overdue DESC, debt_due_date ASC`
    );
    res.json(rows);
  } catch (err) {
    handleError(res, err, "Overdue debt error:");
  }
});

router.get("/customers/:customer_id/detail", async (req, res) => {
  try {
    const [[customer]] = await db.execute(
      `SELECT * FROM v_customer_debt_summary WHERE customer_id = ?`,
      [req.params.customer_id]
    );

    if (!customer) return res.status(404).json({ error: "Không tìm thấy khách hàng." });

    const [orders] = await db.execute(
      `SELECT
        o.order_id,
        o.order_date,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.debt_due_date,
        o.status,
        COALESCE(p.paid_amount, 0) AS paid_amount,
        GREATEST(o.total_amount - COALESCE(p.paid_amount, 0), 0) AS outstanding_amount,
        CASE
          WHEN o.payment_method = 'debt' AND o.payment_status <> 'paid' AND o.debt_due_date < CURRENT_DATE THEN DATEDIFF(CURRENT_DATE, o.debt_due_date)
          ELSE 0
        END AS days_overdue
       FROM orders o
       LEFT JOIN (
         SELECT order_id, SUM(amount) AS paid_amount
         FROM debt_payments
         WHERE order_id IS NOT NULL
         GROUP BY order_id
       ) p ON o.order_id = p.order_id
       WHERE o.customer_id = ?
       ORDER BY o.order_date DESC`,
      [req.params.customer_id]
    );

    const [payments] = await db.execute(
      `SELECT
        dp.payment_id,
        dp.order_id,
        dp.amount,
        dp.payment_method,
        dp.payment_date,
        dp.note,
        e.full_name AS employee_name
       FROM debt_payments dp
       LEFT JOIN employees e ON dp.employee_id = e.employee_id
       WHERE dp.customer_id = ?
       ORDER BY dp.payment_date DESC, dp.payment_id DESC`,
      [req.params.customer_id]
    );

    res.json({ customer, orders, payments });
  } catch (err) {
    handleError(res, err, "Debt customer detail error:");
  }
});

router.post("/payments", async (req, res) => {
  const customerId = toInt(req.body.customer_id);
  const orderId = toInt(req.body.order_id);
  const amount = toPositiveAmount(req.body.amount);
  const method = ["cash", "bank_transfer", "e_wallet", "other"].includes(req.body.payment_method)
    ? req.body.payment_method
    : "cash";
  const note = cleanText(req.body.note) || null;
  const employeeId = req.user?.id || null;

  if (!customerId || !orderId || !amount) {
    return res.status(400).json({ error: "Vui lòng chọn khách hàng, chọn đơn công nợ và nhập số tiền thanh toán hợp lệ." });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO debt_payments (customer_id, order_id, employee_id, amount, payment_method, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customerId, orderId, employeeId, amount, method, note]
    );

    const [[customer]] = await db.execute(
      `SELECT * FROM v_customer_debt_summary WHERE customer_id = ?`,
      [customerId]
    );

    res.status(201).json({
      message: "Ghi nhận thanh toán công nợ thành công. Trigger đã tự giảm current_debt và cập nhật payment_status của đơn.",
      payment_id: result.insertId,
      customer,
    });
  } catch (err) {
    handleError(res, err, "Create debt payment error:");
  }
});

router.patch("/customers/:customer_id/credit-limit", async (req, res) => {
  const creditLimit = Number(req.body.credit_limit);

  if (!Number.isFinite(creditLimit) || creditLimit < 0) {
    return res.status(400).json({ error: "Hạn mức công nợ phải là số không âm." });
  }

  try {
    const [result] = await db.execute(
      `UPDATE customers SET credit_limit = ? WHERE customer_id = ?`,
      [creditLimit, req.params.customer_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy khách hàng." });

    const [[customer]] = await db.execute(
      `SELECT * FROM v_customer_debt_summary WHERE customer_id = ?`,
      [req.params.customer_id]
    );

    res.json({ message: "Cập nhật hạn mức công nợ thành công.", customer });
  } catch (err) {
    handleError(res, err, "Update credit limit error:");
  }
});

module.exports = router;
