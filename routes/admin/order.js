const express = require("express");
const router = express.Router();
const db = require("../../db");

const ALLOWED_STATUS = ["pending", "confirmed", "mixing", "completed", "cancelled"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isSalesEmployee(employee) {
  const jobTitle = normalizeText(employee.job_title);
  return employee.role === "admin" || jobTitle.includes("ban") || jobTitle.includes("sales");
}

function isTechEmployee(employee) {
  const jobTitle = normalizeText(employee.job_title);
  return employee.role === "admin" || jobTitle.includes("ky thuat") || jobTitle.includes("pha mau") || jobTitle.includes("technician");
}

async function readEmployee(connection, employeeId, label) {
  if (!employeeId) return null;

  const [[employee]] = await connection.query(
    `SELECT e.employee_id, e.full_name, e.role, j.job_title
     FROM employees e
     LEFT JOIN jobs j ON e.job_id = j.job_id
     WHERE e.employee_id = ?`,
    [employeeId],
  );

  if (!employee) {
    const err = new Error(`Không tìm thấy ${label}.`);
    err.statusCode = 400;
    throw err;
  }

  return employee;
}

async function ensureShiftAssignment(connection, employeeId, shiftId, orderDate, label) {
  if (!employeeId || !shiftId) return;

  const [[assignment]] = await connection.query(
    `SELECT 1 AS ok
     FROM employees_shifts
     WHERE employee_id = ? AND shift_id = ? AND working_date = ?
     LIMIT 1`,
    [employeeId, shiftId, orderDate],
  );

  if (!assignment) {
    const err = new Error(`${label} chưa được phân vào ca làm này trong ngày tạo đơn (${orderDate}).`);
    err.statusCode = 400;
    throw err;
  }
}

async function validateAssignment(connection, orderId, salesRepId, techId, shiftId) {
  const [[order]] = await connection.query(
    `SELECT order_id, DATE_FORMAT(created_at, '%Y-%m-%d') AS order_date
     FROM orders
     WHERE order_id = ?`,
    [orderId],
  );

  if (!order) {
    const err = new Error("Không tìm thấy đơn hàng.");
    err.statusCode = 404;
    throw err;
  }

  const sales = await readEmployee(connection, salesRepId, "nhân viên bán hàng");
  if (sales && !isSalesEmployee(sales)) {
    const err = new Error("Nhân viên bán hàng phải thuộc vị trí Bán hàng hoặc là quản trị viên.");
    err.statusCode = 400;
    throw err;
  }

  const tech = await readEmployee(connection, techId, "kỹ thuật viên");
  if (tech && !isTechEmployee(tech)) {
    const err = new Error("Kỹ thuật viên phải thuộc vị trí Kỹ thuật/Pha màu hoặc là quản trị viên.");
    err.statusCode = 400;
    throw err;
  }

  if (shiftId) {
    await ensureShiftAssignment(connection, salesRepId, shiftId, order.order_date, "Nhân viên bán hàng");
    await ensureShiftAssignment(connection, techId, shiftId, order.order_date, "Kỹ thuật viên");
  }
}

async function readOrderSummary(connection, orderId) {
  const [[order]] = await connection.query(
    `SELECT o.order_id, o.customer_id, c.name AS customer_name, c.phone,
            o.sales_rep_id, sales.full_name AS sales_rep_name,
            o.tech_id, tech.full_name AS tech_name,
            o.shift_id, s.shift_name,
            o.total_amount, o.paid_amount, o.payment_status,
            o.status, o.street_address, o.ward_id, w.ward_name, p.province_name,
            o.created_at, o.updated_at, o.cancelled_at, o.inventory_restored,
            c.credit_limit, c.current_debt
     FROM orders o
     JOIN customers c ON o.customer_id = c.customer_id
     LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
     LEFT JOIN employees tech ON o.tech_id = tech.employee_id
     LEFT JOIN shifts s ON o.shift_id = s.shift_id
     LEFT JOIN wards w ON o.ward_id = w.ward_id
     LEFT JOIN provinces p ON w.province_id = p.province_id
     WHERE o.order_id = ?`,
    [orderId],
  );
  return order;
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.order_id, o.customer_id, c.name AS customer_name, c.phone,
             o.sales_rep_id, sales.full_name AS sales_rep_name,
             o.tech_id, tech.full_name AS tech_name,
             o.shift_id, s.shift_name,
             o.total_amount, o.paid_amount, o.payment_status,
             o.status, o.street_address, w.ward_name, p.province_name,
             o.created_at, o.updated_at, o.cancelled_at, o.inventory_restored,
             c.credit_limit, c.current_debt
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
      LEFT JOIN employees tech ON o.tech_id = tech.employee_id
      LEFT JOIN shifts s ON o.shift_id = s.shift_id
      LEFT JOIN wards w ON o.ward_id = w.ward_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      ORDER BY o.created_at DESC, o.order_id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assignment-options", async (req, res) => {
  try {
    const [employees] = await db.query(`
      SELECT e.employee_id, e.full_name, e.role, j.job_title,
             CASE
               WHEN e.role = 'admin' OR j.job_title LIKE '%Bán%' OR j.job_title LIKE '%Sales%' THEN 1 ELSE 0
             END AS can_sell,
             CASE
               WHEN e.role = 'admin' OR j.job_title LIKE '%Kỹ thuật%' OR j.job_title LIKE '%Pha màu%' THEN 1 ELSE 0
             END AS can_mix
      FROM employees e
      LEFT JOIN jobs j ON e.job_id = j.job_id
      ORDER BY e.full_name
    `);

    const [shifts] = await db.query("SELECT shift_id, shift_name, start_time, end_time FROM shifts ORDER BY start_time");
    res.json({ employees, shifts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/payments", async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT payment_id, order_id, amount, payment_method, note, paid_at
       FROM payments
       WHERE order_id = ?
       ORDER BY paid_at DESC, payment_id DESC`,
      [req.params.id],
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/payments", async (req, res) => {
  const amount = Number(req.body.amount);
  const paymentMethod = req.body.payment_method || "cash";
  const note = req.body.note ? String(req.body.note).trim() : null;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Số tiền thanh toán phải lớn hơn 0." });
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ." });
  }

  try {
    await db.query(
      `INSERT INTO payments (order_id, amount, payment_method, note)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, amount, paymentMethod, note],
    );

    const order = await readOrderSummary(db, req.params.id);
    res.status(201).json({ message: "Ghi nhận thanh toán thành công.", order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/movements", async (req, res) => {
  try {
    const [movements] = await db.query(
      `SELECT movement_id, created_at, inventory_type, movement_type, order_id,
              quantity_delta, before_quantity, after_quantity, note, sku_code, colorant_name
       FROM v_inventory_movements
       WHERE order_id = ?
       ORDER BY movement_id DESC`,
      [req.params.id],
    );
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await readOrderSummary(db, req.params.id);
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const [details] = await db.query(
      `SELECT od.*, pv.sku_code, pv.volume, pl.name AS line_name, b.name AS brand_name,
              bt.base_name, cs.color_code, cs.color_name
       FROM orderdetails od
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       JOIN productlines pl ON pv.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN colorsystem cs ON od.color_id = cs.color_id
       WHERE od.order_id = ?`,
      [req.params.id],
    );

    const [payments] = await db.query(
      `SELECT payment_id, amount, payment_method, note, paid_at
       FROM payments
       WHERE order_id = ?
       ORDER BY paid_at DESC, payment_id DESC`,
      [req.params.id],
    );

    const [movements] = await db.query(
      `SELECT movement_id, created_at, inventory_type, movement_type, quantity_delta,
              before_quantity, after_quantity, note, sku_code, colorant_name
       FROM v_inventory_movements
       WHERE order_id = ?
       ORDER BY movement_id DESC
       LIMIT 50`,
      [req.params.id],
    );

    res.json({ ...order, details, payments, movements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ error: "Trạng thái đơn hàng không hợp lệ." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    if (status === "completed") {
      const [[currentOrder]] = await connection.query(
        "SELECT sales_rep_id, tech_id, shift_id FROM orders WHERE order_id = ?",
        [req.params.id],
      );
      if (!currentOrder) {
        const err = new Error("Không tìm thấy đơn hàng.");
        err.statusCode = 404;
        throw err;
      }
      await validateAssignment(connection, req.params.id, currentOrder.sales_rep_id, currentOrder.tech_id, currentOrder.shift_id);
    }

    const [result] = await connection.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, req.params.id]);
    if (result.affectedRows === 0) {
      const err = new Error("Không tìm thấy đơn hàng.");
      err.statusCode = 404;
      throw err;
    }

    const order = await readOrderSummary(connection, req.params.id);
    await connection.commit();
    res.json({ message: "Cập nhật trạng thái đơn hàng thành công.", order });
  } catch (err) {
    await connection.rollback();
    res.status(err.statusCode || 400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.patch("/:id/assign", async (req, res) => {
  const salesRepId = req.body.sales_rep_id ? Number(req.body.sales_rep_id) : null;
  const techId = req.body.tech_id ? Number(req.body.tech_id) : null;
  const shiftId = req.body.shift_id ? Number(req.body.shift_id) : null;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateAssignment(connection, req.params.id, salesRepId, techId, shiftId);

    const [result] = await connection.query(
      `UPDATE orders
       SET sales_rep_id = ?, tech_id = ?, shift_id = ?
       WHERE order_id = ?`,
      [salesRepId, techId, shiftId, req.params.id],
    );
    if (result.affectedRows === 0) {
      const err = new Error("Không tìm thấy đơn hàng.");
      err.statusCode = 404;
      throw err;
    }

    const order = await readOrderSummary(connection, req.params.id);
    await connection.commit();
    res.json({ message: "Gán nhân sự/ca làm cho đơn hàng thành công.", order });
  } catch (err) {
    await connection.rollback();
    res.status(err.statusCode || 400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
