const express = require("express");
const router = express.Router();
const db = require("../../db");

const ALLOWED_STATUS = ["pending", "confirmed", "mixing", "completed", "cancelled"];
const STATUS_TRANSITIONS = {
  pending: ["pending", "confirmed", "cancelled"],
  confirmed: ["confirmed", "mixing", "cancelled"],
  mixing: ["mixing", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

function normalizeId(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function hasSalesRole(employee) {
  const title = String(employee.job_title || "").toLowerCase();
  return employee.role === "admin" || title.includes("bán") || title.includes("kinh doanh");
}

function hasTechRole(employee) {
  const title = String(employee.job_title || "").toLowerCase();
  return employee.role === "admin" || title.includes("kỹ thuật") || title.includes("pha màu");
}

async function readEmployee(connection, employeeId, label) {
  const [[employee]] = await connection.query(
    `SELECT e.employee_id, e.full_name, e.role, j.job_title
     FROM employees e
     LEFT JOIN jobs j ON e.job_id = j.job_id
     WHERE e.employee_id = ?`,
    [employeeId],
  );

  if (!employee) throw new Error(`${label} không tồn tại.`);
  return employee;
}

async function assertEmployeeAssignedToShift(connection, employee, shiftId, orderDate, label) {
  if (employee.role === "admin") return;

  const [[assignment]] = await connection.query(
    `SELECT 1 AS ok
     FROM employees_shifts
     WHERE employee_id = ? AND shift_id = ? AND working_date = ?
     LIMIT 1`,
    [employee.employee_id, shiftId, orderDate],
  );

  if (!assignment) {
    throw new Error(`${label} chưa được phân vào ca này trong ngày tạo đơn (${orderDate}).`);
  }
}

async function validateAssignment(connection, { salesRepId, techId, shiftId, orderDate }) {
  if ((salesRepId || techId) && !shiftId) {
    throw new Error("Khi gán nhân sự cho đơn hàng phải chọn cả ca làm.");
  }

  if (shiftId) {
    const [[shift]] = await connection.query("SELECT shift_id FROM shifts WHERE shift_id = ?", [shiftId]);
    if (!shift) throw new Error("Ca làm không tồn tại.");
  }

  if (salesRepId) {
    const sales = await readEmployee(connection, salesRepId, "Nhân viên bán hàng");
    if (!hasSalesRole(sales)) {
      throw new Error("Nhân viên bán hàng phải thuộc job Bán hàng/Kinh doanh hoặc là admin.");
    }
    if (shiftId) await assertEmployeeAssignedToShift(connection, sales, shiftId, orderDate, "Nhân viên bán hàng");
  }

  if (techId) {
    const tech = await readEmployee(connection, techId, "Kỹ thuật viên");
    if (!hasTechRole(tech)) {
      throw new Error("Kỹ thuật viên phải thuộc job Kỹ thuật viên pha màu hoặc là admin.");
    }
    if (shiftId) await assertEmployeeAssignedToShift(connection, tech, shiftId, orderDate, "Kỹ thuật viên");
  }
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.order_id, o.customer_id, c.name AS customer_name, c.phone,
             DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at_text,
             o.sales_rep_id, sales.full_name AS sales_rep_name, sales_job.job_title AS sales_job_title,
             o.tech_id, tech.full_name AS tech_name, tech_job.job_title AS tech_job_title,
             o.shift_id, s.shift_name,
             o.total_amount, o.status, o.street_address, w.ward_name, p.province_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
      LEFT JOIN jobs sales_job ON sales.job_id = sales_job.job_id
      LEFT JOIN employees tech ON o.tech_id = tech.employee_id
      LEFT JOIN jobs tech_job ON tech.job_id = tech_job.job_id
      LEFT JOIN shifts s ON o.shift_id = s.shift_id
      LEFT JOIN wards w ON o.ward_id = w.ward_id
      LEFT JOIN provinces p ON w.province_id = p.province_id
      ORDER BY o.order_id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS created_at_text,
              c.name AS customer_name, c.phone, c.email,
              w.ward_name, p.province_name,
              sales.full_name AS sales_rep_name, sales_job.job_title AS sales_job_title,
              tech.full_name AS tech_name, tech_job.job_title AS tech_job_title,
              s.shift_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN wards w ON o.ward_id = w.ward_id
       LEFT JOIN provinces p ON w.province_id = p.province_id
       LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
       LEFT JOIN jobs sales_job ON sales.job_id = sales_job.job_id
       LEFT JOIN employees tech ON o.tech_id = tech.employee_id
       LEFT JOIN jobs tech_job ON tech.job_id = tech_job.job_id
       LEFT JOIN shifts s ON o.shift_id = s.shift_id
       WHERE o.order_id = ?`,
      [req.params.id],
    );

    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const [details] = await db.query(
      `SELECT od.*, pv.sku_code, pv.volume, pl.name AS line_name, b.name AS brand_name,
              bt.base_name, cs.color_code, cs.color_name,
              od.quantity * od.price_at_sale AS line_total
       FROM orderdetails od
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       JOIN productlines pl ON pv.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN colorsystem cs ON od.color_id = cs.color_id
       WHERE od.order_id = ?`,
      [req.params.id],
    );

    res.json({ ...order, details });
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

    const [[order]] = await connection.query(
      `SELECT order_id, status, sales_rep_id, tech_id, shift_id
       FROM orders
       WHERE order_id = ?
       FOR UPDATE`,
      [req.params.id],
    );

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }

    if (!STATUS_TRANSITIONS[order.status]?.includes(status)) {
      throw new Error(`Không được chuyển trạng thái từ ${order.status} sang ${status}.`);
    }

    if (status === "completed" && (!order.sales_rep_id || !order.tech_id || !order.shift_id)) {
      throw new Error("Muốn hoàn tất đơn hàng phải gán nhân viên bán, kỹ thuật viên và ca làm trước.");
    }

    await connection.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, req.params.id]);
    await connection.commit();

    const message = status === "cancelled"
      ? "Đã hủy đơn hàng và hoàn lại tồn kho sơn gốc/tinh màu."
      : "Cập nhật trạng thái đơn hàng thành công.";
    res.json({ message });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.patch("/:id/assign", async (req, res) => {
  const salesRepId = normalizeId(req.body.sales_rep_id);
  const techId = normalizeId(req.body.tech_id);
  const shiftId = normalizeId(req.body.shift_id);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [[order]] = await connection.query(
      `SELECT order_id, status, DATE_FORMAT(created_at, '%Y-%m-%d') AS order_date
       FROM orders
       WHERE order_id = ?
       FOR UPDATE`,
      [req.params.id],
    );

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }

    if (["completed", "cancelled"].includes(order.status)) {
      throw new Error("Không được gán nhân sự cho đơn đã hoàn tất hoặc đã hủy.");
    }

    await validateAssignment(connection, {
      salesRepId,
      techId,
      shiftId,
      orderDate: order.order_date,
    });

    const [result] = await connection.query(
      `UPDATE orders
       SET sales_rep_id = ?, tech_id = ?, shift_id = ?
       WHERE order_id = ?`,
      [salesRepId, techId, shiftId, req.params.id],
    );

    await connection.commit();
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    res.json({ message: "Gán nhân sự/ca làm cho đơn hàng thành công." });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
