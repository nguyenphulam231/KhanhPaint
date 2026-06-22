const express = require("express");
const router = express.Router();
const db = require("../../db");

function toInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function normalizeItems(rawItems) {
  const map = new Map();

  (Array.isArray(rawItems) ? rawItems : []).forEach((item) => {
    const variantId = toInt(item.variant_id);
    const colorId = toInt(item.color_id);
    const quantity = toInt(item.quantity);

    if (!variantId || !colorId || !quantity || quantity <= 0) return;

    const key = `${variantId}:${colorId}`;
    const existing = map.get(key) || { variant_id: variantId, color_id: colorId, quantity: 0 };
    existing.quantity += quantity;
    map.set(key, existing);
  });

  return Array.from(map.values());
}

function isDbBusinessError(err) {
  return err && (err.sqlState === "45000" || err.code === "ER_CHECK_CONSTRAINT_VIOLATED");
}

async function getOrderDetail(orderId, connection = db) {
  const [[order]] = await connection.execute(
    `SELECT
      o.order_id,
      o.order_date,
      o.total_amount,
      o.payment_method,
      o.payment_status,
      o.debt_due_date,
      CASE
        WHEN o.payment_method = 'debt' AND o.payment_status <> 'paid' AND o.debt_due_date < CURRENT_DATE THEN DATEDIFF(CURRENT_DATE, o.debt_due_date)
        ELSE 0
      END AS days_overdue,
      o.status,
      c.customer_id,
      c.name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      c.address AS customer_address,
      c.credit_limit,
      c.current_debt,
      sales.full_name AS sales_rep_name,
      tech.full_name AS tech_name,
      s.shift_name
     FROM orders o
     JOIN customers c ON o.customer_id = c.customer_id
     LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
     LEFT JOIN employees tech ON o.tech_id = tech.employee_id
     LEFT JOIN shifts s ON o.shift_id = s.shift_id
     WHERE o.order_id = ?`,
    [orderId]
  );

  if (!order) return null;

  const [details] = await connection.execute(
    `SELECT
      od.order_id,
      od.variant_id,
      od.color_id,
      od.quantity,
      od.price_at_sale,
      (od.quantity * od.price_at_sale) AS line_total,
      pv.sku_code,
      pv.volume,
      bt.base_name,
      pl.name AS line_name,
      b.name AS brand_name,
      cs.color_code,
      cs.color_name
     FROM orderdetails od
     JOIN productvariants pv ON od.variant_id = pv.variant_id
     JOIN basetypes bt ON pv.base_id = bt.base_id
     JOIN productlines pl ON bt.line_id = pl.line_id
     JOIN brands b ON pl.brand_id = b.brand_id
     JOIN colorsystem cs ON od.color_id = cs.color_id
     WHERE od.order_id = ?
     ORDER BY b.name, pl.name, pv.sku_code`,
    [orderId]
  );

  const [logs] = await connection.execute(
    `SELECT
      log_id,
      order_id,
      variant_id,
      colorant_id,
      movement_type,
      quantity_change,
      ml_change,
      note,
      created_at
     FROM inventory_logs
     WHERE order_id = ?
     ORDER BY log_id`,
    [orderId]
  );

  return { order, details, logs };
}

router.get("/options", async (req, res) => {
  try {
    const [customers] = await db.execute(
      `SELECT customer_id, name, phone, email, credit_limit, current_debt,
        CASE
          WHEN current_debt > credit_limit AND credit_limit > 0 THEN 'Vượt hạn mức'
          WHEN current_debt > 0 THEN 'Đang nợ'
          ELSE 'Không nợ'
        END AS debt_status
       FROM customers
       ORDER BY name`
    );

    const [employees] = await db.execute(
      `SELECT e.employee_id, e.full_name, e.role, j.job_title
       FROM employees e
       LEFT JOIN jobs j ON e.job_id = j.job_id
       ORDER BY e.full_name`
    );

    const [shifts] = await db.execute(
      `SELECT shift_id, shift_name, start_time, end_time
       FROM shifts
       ORDER BY start_time`
    );

    const [variants] = await db.execute(
      `SELECT
        pv.variant_id,
        pv.base_id,
        pv.sku_code,
        pv.volume,
        pv.unit_price,
        pv.stock_quantity,
        bt.base_name,
        pl.name AS line_name,
        b.name AS brand_name
       FROM productvariants pv
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       ORDER BY b.name, pl.name, bt.base_name, pv.volume`
    );

    const [colors] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        cs.base_id,
        bt.base_name
       FROM colorsystem cs
       JOIN basetypes bt ON cs.base_id = bt.base_id
       ORDER BY cs.color_code`
    );

    res.json({ customers, employees, shifts, variants, colors });
  } catch (err) {
    console.error("Get order options error:", err);
    res.status(500).json({ error: "Lỗi tải dữ liệu tạo đơn hàng." });
  }
});

router.post("/", async (req, res) => {
  const customerId = toInt(req.body.customer_id);
  const salesRepId = toInt(req.body.sales_rep_id);
  const techId = toInt(req.body.tech_id);
  const shiftId = toInt(req.body.shift_id);
  const paymentMethod = req.body.payment_method === "debt" ? "debt" : "cash";
  const paymentStatus = paymentMethod === "debt" ? "unpaid" : "paid";
  const debtDueDate = paymentMethod === "debt" && /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.debt_due_date || ""))
    ? req.body.debt_due_date
    : null;
  const status = ["pending", "completed"].includes(req.body.status) ? req.body.status : "completed";
  const items = normalizeItems(req.body.items);

  if (!customerId) {
    return res.status(400).json({ error: "Vui lòng chọn khách hàng." });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: "Đơn hàng cần ít nhất một dòng sản phẩm." });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [[customer]] = await conn.execute(
      `SELECT customer_id, name, credit_limit, current_debt
       FROM customers
       WHERE customer_id = ?
       FOR UPDATE`,
      [customerId]
    );

    if (!customer) {
      const error = new Error("Khách hàng không tồn tại.");
      error.statusCode = 404;
      throw error;
    }

    let estimatedTotal = 0;
    const preparedItems = [];

    for (const item of items) {
      const [[variant]] = await conn.execute(
        `SELECT variant_id, base_id, sku_code, unit_price, stock_quantity
         FROM productvariants
         WHERE variant_id = ?
         FOR UPDATE`,
        [item.variant_id]
      );

      if (!variant) {
        const error = new Error("Product Variant không tồn tại.");
        error.statusCode = 400;
        throw error;
      }

      if (variant.stock_quantity < item.quantity) {
        const error = new Error(`Không đủ tồn kho cho SKU ${variant.sku_code}.`);
        error.statusCode = 409;
        throw error;
      }

      const [[color]] = await conn.execute(
        `SELECT color_id, color_code, base_id
         FROM colorsystem
         WHERE color_id = ?`,
        [item.color_id]
      );

      if (!color) {
        const error = new Error("Mã màu không tồn tại.");
        error.statusCode = 400;
        throw error;
      }

      if (Number(color.base_id) !== Number(variant.base_id)) {
        const error = new Error(`Mã màu ${color.color_code} không tương thích với SKU ${variant.sku_code}.`);
        error.statusCode = 409;
        throw error;
      }

      const [formula] = await conn.execute(
        `SELECT c.colorant_id, c.colorant_name, c.stock_ml, csc.amount_ml
         FROM colorsystem_colorants csc
         JOIN colorants c ON csc.colorant_id = c.colorant_id
         WHERE csc.color_id = ?
         FOR UPDATE`,
        [item.color_id]
      );

      if (formula.length === 0) {
        const error = new Error(`Mã màu ${color.color_code} chưa có công thức pha.`);
        error.statusCode = 409;
        throw error;
      }

      const insufficient = formula.find(
        (row) => Number(row.stock_ml) < Number(row.amount_ml) * item.quantity
      );

      if (insufficient) {
        const error = new Error(`Không đủ tinh màu ${insufficient.colorant_name}.`);
        error.statusCode = 409;
        throw error;
      }

      const priceAtSale = Number(variant.unit_price);
      estimatedTotal += priceAtSale * item.quantity;
      preparedItems.push({ ...item, price_at_sale: priceAtSale });
    }

    if (paymentMethod === "debt") {
      const creditLimit = Number(customer.credit_limit || 0);
      const currentDebt = Number(customer.current_debt || 0);

      if (creditLimit <= 0 || currentDebt + estimatedTotal > creditLimit) {
        const error = new Error(
          `Đơn hàng vượt hạn mức công nợ. Hạn mức: ${creditLimit.toLocaleString("vi-VN")} VND, nợ hiện tại: ${currentDebt.toLocaleString("vi-VN")} VND.`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const [orderResult] = await conn.execute(
      `INSERT INTO orders
       (customer_id, sales_rep_id, tech_id, shift_id, payment_method, payment_status, debt_due_date, status, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [customerId, salesRepId || null, techId || null, shiftId || null, paymentMethod, paymentStatus, debtDueDate, status]
    );

    const orderId = orderResult.insertId;

    for (const item of preparedItems) {
      await conn.execute(
        `INSERT INTO orderdetails
         (order_id, variant_id, color_id, quantity, price_at_sale)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.variant_id, item.color_id, item.quantity, item.price_at_sale]
      );
    }

    const detail = await getOrderDetail(orderId, conn);

    await conn.commit();

    res.status(201).json({
      message: "Tạo đơn hàng thành công. Trigger đã tự động tính tổng tiền và trừ tồn kho kép.",
      ...detail,
    });
  } catch (err) {
    await conn.rollback();

    console.error("Create order transaction error:", err);

    if (isDbBusinessError(err) || err.statusCode) {
      return res.status(err.statusCode || 409).json({ error: err.message || "Dữ liệu đơn hàng không hợp lệ." });
    }

    res.status(500).json({ error: "Lỗi tạo đơn hàng." });
  } finally {
    conn.release();
  }
});

router.patch("/:order_id/status", async (req, res) => {
  const status = String(req.body.status || "").trim();
  if (status !== "cancelled") {
    return res.status(400).json({ error: "Hiện API chỉ hỗ trợ hủy đơn để trigger hoàn tồn kho và công nợ." });
  }

  try {
    const [result] = await db.execute(
      `UPDATE orders
       SET status = ?
       WHERE order_id = ? AND status <> 'cancelled'`,
      [status, req.params.order_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng hoặc đơn đã hủy." });
    }

    const detail = await getOrderDetail(req.params.order_id);
    res.json({
      message: "Đã hủy đơn hàng. Trigger đã hoàn tồn kho kép và giảm công nợ còn tồn.",
      ...detail,
    });
  } catch (err) {
    console.error("Update order status error:", err);
    if (isDbBusinessError(err) || err.statusCode) {
      return res.status(err.statusCode || 409).json({ error: err.message || "Không thể cập nhật trạng thái đơn hàng." });
    }
    res.status(500).json({ error: "Lỗi cập nhật trạng thái đơn hàng." });
  }
});

router.get("/:order_id", async (req, res) => {
  try {
    const detail = await getOrderDetail(req.params.order_id);
    if (!detail) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    res.json(detail);
  } catch (err) {
    console.error("Get order detail error:", err);
    res.status(500).json({ error: "Lỗi tải chi tiết đơn hàng." });
  }
});

module.exports = router;
