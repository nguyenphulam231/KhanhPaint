const express = require("express");
const router = express.Router();
const db = require("../../db");
const { authenticate, authorizeCustomer } = require("../../middleware/authMiddleware");

function cleanText(value) {
  return String(value || "").trim();
}

function likeTerm(value) {
  return `%${cleanText(value)}%`;
}

function toInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
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

function handleDbError(res, err, label) {
  console.error(label, err);
  if (isDbBusinessError(err) || err.statusCode) {
    return res.status(err.statusCode || 409).json({ error: err.message || "Dữ liệu không hợp lệ." });
  }
  return res.status(500).json({ error: "Lỗi hệ thống." });
}

async function getOrderDetailForCustomer(orderId, customerId, connection = db) {
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
      sales.full_name AS sales_rep_name,
      tech.full_name AS tech_name,
      s.shift_name
     FROM orders o
     LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
     LEFT JOIN employees tech ON o.tech_id = tech.employee_id
     LEFT JOIN shifts s ON o.shift_id = s.shift_id
     WHERE o.order_id = ? AND o.customer_id = ?`,
    [orderId, customerId]
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
      pv.base_id,
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

  return { order, details };
}

// Public customer catalog. It powers product browsing before login.
router.get("/products", async (req, res) => {
  const search = cleanText(req.query.search);
  const brandId = toInt(req.query.brand_id);
  const lineId = toInt(req.query.line_id);
  const interior = cleanText(req.query.interior);
  const stock = cleanText(req.query.stock);
  const params = [];
  let where = "WHERE 1 = 1";

  if (search) {
    where += ` AND (pv.sku_code LIKE ? OR b.name LIKE ? OR pl.name LIKE ? OR bt.base_name LIKE ? OR pv.volume LIKE ?)`;
    params.push(likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search));
  }

  if (brandId) {
    where += " AND b.brand_id = ?";
    params.push(brandId);
  }

  if (lineId) {
    where += " AND pl.line_id = ?";
    params.push(lineId);
  }

  if (interior === "1" || interior === "0") {
    where += " AND pl.is_interior = ?";
    params.push(Number(interior));
  }

  if (stock === "available") {
    where += " AND pv.stock_quantity > 0";
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        pv.variant_id,
        pv.base_id,
        pv.sku_code,
        pv.volume,
        pv.unit_price,
        pv.stock_quantity,
        pv.warehouse_location,
        bt.base_name,
        bt.coverage_rate,
        bt.drying_time,
        bt.gloss_level,
        bt.recommended_layers,
        pl.line_id,
        pl.name AS line_name,
        pl.is_interior,
        b.brand_id,
        b.name AS brand_name,
        CASE
          WHEN pv.stock_quantity <= 0 THEN 'Hết hàng'
          WHEN pv.stock_quantity <= 5 THEN 'Sắp hết'
          ELSE 'Còn hàng'
        END AS stock_status,
        COUNT(cs.color_id) AS available_color_count
       FROM productvariants pv
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       LEFT JOIN colorsystem cs ON bt.base_id = cs.base_id
       ${where}
       GROUP BY pv.variant_id, pv.base_id, pv.sku_code, pv.volume, pv.unit_price, pv.stock_quantity, pv.warehouse_location,
        bt.base_name, bt.coverage_rate, bt.drying_time, bt.gloss_level, bt.recommended_layers,
        pl.line_id, pl.name, pl.is_interior, b.brand_id, b.name
       ORDER BY b.name, pl.name, bt.base_name, pv.volume`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Client product list error:");
  }
});

router.get("/catalog-options", async (req, res) => {
  try {
    const [brands] = await db.execute("SELECT brand_id, name FROM brands ORDER BY name");
    const [lines] = await db.execute(
      `SELECT pl.line_id, pl.brand_id, pl.name, b.name AS brand_name, pl.is_interior
       FROM productlines pl
       JOIN brands b ON pl.brand_id = b.brand_id
       ORDER BY b.name, pl.name`
    );
    res.json({ brands, lines });
  } catch (err) {
    handleDbError(res, err, "Client catalog options error:");
  }
});

router.get("/colors", async (req, res) => {
  const baseId = toInt(req.query.base_id);
  const search = cleanText(req.query.search);
  const params = [];
  let where = "WHERE 1 = 1";

  if (baseId) {
    where += " AND cs.base_id = ?";
    params.push(baseId);
  }

  if (search) {
    where += " AND (cs.color_code LIKE ? OR cs.color_name LIKE ?)";
    params.push(likeTerm(search), likeTerm(search));
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        cs.base_id,
        bt.base_name,
        pl.name AS line_name,
        b.name AS brand_name,
        COUNT(csc.colorant_id) AS colorant_count,
        COALESCE(SUM(csc.amount_ml), 0) AS total_amount_ml,
        FLOOR(MIN(CASE WHEN csc.amount_ml > 0 THEN c.stock_ml / csc.amount_ml ELSE NULL END)) AS max_mix_quantity,
        CASE
          WHEN COUNT(csc.colorant_id) = 0 THEN 'Chưa có công thức'
          WHEN FLOOR(MIN(CASE WHEN csc.amount_ml > 0 THEN c.stock_ml / csc.amount_ml ELSE NULL END)) <= 0 THEN 'Thiếu tinh màu'
          WHEN FLOOR(MIN(CASE WHEN csc.amount_ml > 0 THEN c.stock_ml / csc.amount_ml ELSE NULL END)) <= 3 THEN 'Sắp thiếu tinh màu'
          ELSE 'Có thể pha'
        END AS mix_status
       FROM colorsystem cs
       JOIN basetypes bt ON cs.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       LEFT JOIN colorsystem_colorants csc ON cs.color_id = csc.color_id
       LEFT JOIN colorants c ON csc.colorant_id = c.colorant_id
       ${where}
       GROUP BY cs.color_id, cs.color_code, cs.color_name, cs.base_id, bt.base_name, pl.name, b.name
       ORDER BY cs.color_code`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Client colors error:");
  }
});

router.use(authenticate, authorizeCustomer);

router.get("/profile", async (req, res) => {
  try {
    const [[profile]] = await db.execute(
      `SELECT *
       FROM v_customer_debt_summary
       WHERE customer_id = ?`,
      [req.user.id]
    );

    if (!profile) return res.status(404).json({ error: "Không tìm thấy hồ sơ khách hàng." });

    const [openOrders] = await db.execute(
      `SELECT
        o.order_id,
        o.order_date,
        o.total_amount,
        o.payment_status,
        o.debt_due_date,
        COALESCE(p.paid_amount, 0) AS paid_amount,
        GREATEST(o.total_amount - COALESCE(p.paid_amount, 0), 0) AS outstanding_amount,
        CASE
          WHEN o.debt_due_date < CURRENT_DATE AND o.payment_status <> 'paid' THEN DATEDIFF(CURRENT_DATE, o.debt_due_date)
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
         AND o.payment_method = 'debt'
         AND o.status <> 'cancelled'
         AND o.payment_status <> 'paid'
       ORDER BY o.debt_due_date ASC, o.order_date DESC`,
      [req.user.id]
    );

    const [payments] = await db.execute(
      `SELECT payment_id, order_id, amount, payment_method, payment_date, note
       FROM debt_payments
       WHERE customer_id = ?
       ORDER BY payment_date DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({ profile, open_orders: openOrders, payments });
  } catch (err) {
    handleDbError(res, err, "Client profile error:");
  }
});

router.put("/profile", async (req, res) => {
  const name = cleanText(req.body.name);
  const phone = cleanText(req.body.phone);
  const address = cleanText(req.body.address);

  if (!name || !phone) {
    return res.status(400).json({ error: "Vui lòng nhập họ tên và số điện thoại." });
  }

  try {
    await db.execute(
      `UPDATE customers
       SET name = ?, phone = ?, address = ?
       WHERE customer_id = ?`,
      [name, phone, address || null, req.user.id]
    );

    res.json({ message: "Cập nhật hồ sơ thành công." });
  } catch (err) {
    handleDbError(res, err, "Client update profile error:");
  }
});

router.get("/orders", async (req, res) => {
  try {
    const [orders] = await db.execute(
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
        COUNT(od.variant_id) AS item_count
       FROM orders o
       LEFT JOIN orderdetails od ON o.order_id = od.order_id
       WHERE o.customer_id = ?
       GROUP BY o.order_id, o.order_date, o.total_amount, o.payment_method, o.payment_status, o.debt_due_date, o.status
       ORDER BY o.order_date DESC`,
      [req.user.id]
    );

    res.json(orders);
  } catch (err) {
    handleDbError(res, err, "Client orders error:");
  }
});

router.get("/orders/:order_id", async (req, res) => {
  try {
    const detail = await getOrderDetailForCustomer(req.params.order_id, req.user.id);
    if (!detail) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    res.json(detail);
  } catch (err) {
    handleDbError(res, err, "Client order detail error:");
  }
});

router.get("/purchased-colors", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        cs.base_id,
        bt.base_name,
        MAX(o.order_date) AS last_order_date,
        SUM(od.quantity) AS total_quantity,
        GROUP_CONCAT(DISTINCT pv.sku_code ORDER BY pv.sku_code SEPARATOR ', ') AS purchased_skus
       FROM orders o
       JOIN orderdetails od ON o.order_id = od.order_id
       JOIN colorsystem cs ON od.color_id = cs.color_id
       JOIN basetypes bt ON cs.base_id = bt.base_id
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       WHERE o.customer_id = ? AND o.status <> 'cancelled'
       GROUP BY cs.color_id, cs.color_code, cs.color_name, cs.base_id, bt.base_name
       ORDER BY last_order_date DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Client purchased colors error:");
  }
});

router.post("/orders", async (req, res) => {
  const customerId = req.user.id;
  const paymentMethod = req.body.payment_method === "debt" ? "debt" : "cash";
  const debtDueDate = paymentMethod === "debt" && isValidDate(req.body.debt_due_date)
    ? req.body.debt_due_date
    : null;
  const items = normalizeItems(req.body.items);

  if (items.length === 0) {
    return res.status(400).json({ error: "Yêu cầu đặt hàng cần ít nhất một sản phẩm." });
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

      const insufficient = formula.find((row) => Number(row.stock_ml) < Number(row.amount_ml) * item.quantity);
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
          `Yêu cầu đặt hàng vượt hạn mức công nợ. Hạn mức: ${creditLimit.toLocaleString("vi-VN")} VND, nợ hiện tại: ${currentDebt.toLocaleString("vi-VN")} VND.`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const [orderResult] = await conn.execute(
      `INSERT INTO orders
       (customer_id, payment_method, payment_status, debt_due_date, status, total_amount)
       VALUES (?, ?, ?, ?, 'pending', 0)`,
      [customerId, paymentMethod, paymentMethod === "debt" ? "unpaid" : "paid", debtDueDate]
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

    const detail = await getOrderDetailForCustomer(orderId, customerId, conn);
    await conn.commit();

    res.status(201).json({
      message: "Gửi yêu cầu đặt hàng thành công. Hệ thống đã giữ tồn kho và ghi nhận công nợ nếu chọn mua nợ.",
      ...detail,
    });
  } catch (err) {
    await conn.rollback();
    return handleDbError(res, err, "Client checkout error:");
  } finally {
    conn.release();
  }
});

module.exports = router;
