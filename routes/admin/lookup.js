const express = require("express");
const router = express.Router();
const db = require("../../db");

function cleanText(value) {
  return String(value || "").trim();
}

function likeTerm(value) {
  return `%${cleanText(value)}%`;
}

function toPositiveInt(value, fallback = 20, max = 100) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(number, max);
}

function handleDbError(res, err, label) {
  console.error(label, err);
  return res.status(500).json({ error: "Lỗi tải dữ liệu." });
}

router.get("/inventory/products", async (req, res) => {
  const search = cleanText(req.query.search);
  const status = cleanText(req.query.status);
  const params = [];

  let where = "WHERE 1 = 1";

  if (search) {
    where += ` AND (
      pv.sku_code LIKE ? OR b.name LIKE ? OR pl.name LIKE ? OR bt.base_name LIKE ? OR pv.volume LIKE ?
    )`;
    params.push(likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search));
  }

  if (status === "out") {
    where += " AND pv.stock_quantity <= 0";
  } else if (status === "low") {
    where += " AND pv.stock_quantity > 0 AND pv.stock_quantity <= 5";
  } else if (status === "ok") {
    where += " AND pv.stock_quantity > 5";
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        pv.variant_id,
        pv.sku_code,
        b.name AS brand_name,
        pl.name AS line_name,
        bt.base_name,
        pv.volume,
        pv.unit_price,
        pv.stock_quantity,
        pv.warehouse_location,
        CASE
          WHEN pv.stock_quantity <= 0 THEN 'Hết hàng'
          WHEN pv.stock_quantity <= 5 THEN 'Sắp hết'
          ELSE 'Còn hàng'
        END AS stock_status
      FROM productvariants pv
      JOIN basetypes bt ON pv.base_id = bt.base_id
      JOIN productlines pl ON bt.line_id = pl.line_id
      JOIN brands b ON pl.brand_id = b.brand_id
      ${where}
      ORDER BY pv.stock_quantity ASC, b.name, pl.name, bt.base_name`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get product inventory error:");
  }
});

router.get("/inventory/colorants", async (req, res) => {
  const search = cleanText(req.query.search);
  const status = cleanText(req.query.status);
  const params = [];

  let where = "WHERE 1 = 1";

  if (search) {
    where += " AND colorant_name LIKE ?";
    params.push(likeTerm(search));
  }

  if (status === "out") {
    where += " AND stock_ml <= 0";
  } else if (status === "low") {
    where += " AND stock_ml > 0 AND stock_ml <= 500";
  } else if (status === "ok") {
    where += " AND stock_ml > 500";
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        colorant_id,
        colorant_name,
        stock_ml,
        unit_price_per_ml,
        CASE
          WHEN stock_ml <= 0 THEN 'Hết tinh màu'
          WHEN stock_ml <= 500 THEN 'Sắp hết'
          ELSE 'Còn đủ'
        END AS stock_status
       FROM colorants
       ${where}
       ORDER BY stock_ml ASC, colorant_name`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get colorant inventory error:");
  }
});

router.get("/colors", async (req, res) => {
  const search = cleanText(req.query.search);
  const params = [];
  let where = "WHERE 1 = 1";

  if (search) {
    where += " AND (cs.color_code LIKE ? OR cs.color_name LIKE ? OR bt.base_name LIKE ? OR pl.name LIKE ? OR b.name LIKE ?)";
    params.push(likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search));
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        bt.base_name,
        pl.name AS line_name,
        b.name AS brand_name,
        COUNT(csc.colorant_id) AS colorant_count,
        COALESCE(SUM(csc.amount_ml), 0) AS total_amount_ml
       FROM colorsystem cs
       JOIN basetypes bt ON cs.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       LEFT JOIN colorsystem_colorants csc ON cs.color_id = csc.color_id
       ${where}
       GROUP BY cs.color_id, cs.color_code, cs.color_name, bt.base_name, pl.name, b.name
       ORDER BY cs.color_code`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get colors error:");
  }
});

router.get("/colors/:color_id/formula", async (req, res) => {
  try {
    const [[color]] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        cs.base_id,
        bt.base_name,
        pl.name AS line_name,
        b.name AS brand_name
       FROM colorsystem cs
       JOIN basetypes bt ON cs.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       WHERE cs.color_id = ?`,
      [req.params.color_id]
    );

    if (!color) {
      return res.status(404).json({ error: "Không tìm thấy mã màu." });
    }

    const [formula] = await db.execute(
      `SELECT
        c.colorant_id,
        c.colorant_name,
        c.stock_ml,
        c.unit_price_per_ml,
        csc.amount_ml,
        ROUND(csc.amount_ml * c.unit_price_per_ml, 2) AS estimated_colorant_cost
       FROM colorsystem_colorants csc
       JOIN colorants c ON csc.colorant_id = c.colorant_id
       WHERE csc.color_id = ?
       ORDER BY c.colorant_name`,
      [req.params.color_id]
    );

    res.json({
      color,
      formula,
      total_amount_ml: formula.reduce((sum, item) => sum + Number(item.amount_ml || 0), 0),
      estimated_colorant_cost: formula.reduce(
        (sum, item) => sum + Number(item.estimated_colorant_cost || 0),
        0
      ),
    });
  } catch (err) {
    handleDbError(res, err, "Get formula detail error:");
  }
});

router.get("/formulas", async (req, res) => {
  const code = cleanText(req.query.code);
  if (!code) return res.status(400).json({ error: "Vui lòng nhập mã màu." });

  try {
    const [[color]] = await db.execute(
      `SELECT color_id FROM colorsystem WHERE color_code = ? OR color_code LIKE ? LIMIT 1`,
      [code, likeTerm(code)]
    );

    if (!color) {
      return res.status(404).json({ error: "Không tìm thấy mã màu." });
    }

    const [[colorInfo]] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        cs.base_id,
        bt.base_name,
        pl.name AS line_name,
        b.name AS brand_name
       FROM colorsystem cs
       JOIN basetypes bt ON cs.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       WHERE cs.color_id = ?`,
      [color.color_id]
    );

    const [formula] = await db.execute(
      `SELECT
        c.colorant_id,
        c.colorant_name,
        c.stock_ml,
        c.unit_price_per_ml,
        csc.amount_ml,
        ROUND(csc.amount_ml * c.unit_price_per_ml, 2) AS estimated_colorant_cost
       FROM colorsystem_colorants csc
       JOIN colorants c ON csc.colorant_id = c.colorant_id
       WHERE csc.color_id = ?
       ORDER BY c.colorant_name`,
      [color.color_id]
    );

    res.json({
      color: colorInfo,
      formula,
      total_amount_ml: formula.reduce((sum, item) => sum + Number(item.amount_ml || 0), 0),
      estimated_colorant_cost: formula.reduce(
        (sum, item) => sum + Number(item.estimated_colorant_cost || 0),
        0
      ),
    });
  } catch (err) {
    handleDbError(res, err, "Search formula error:");
  }
});

router.get("/customers", async (req, res) => {
  const search = cleanText(req.query.search);
  const params = [];
  let where = "WHERE 1 = 1";

  if (search) {
    where += " AND (ds.name LIKE ? OR ds.phone LIKE ? OR ds.email LIKE ?)";
    params.push(likeTerm(search), likeTerm(search), likeTerm(search));
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        ds.customer_id,
        ds.name,
        ds.phone,
        ds.email,
        ds.address,
        ds.credit_limit,
        ds.current_debt,
        ds.remaining_credit,
        ds.next_due_date,
        ds.overdue_amount,
        ds.debt_status,
        COUNT(o.order_id) AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_spent
       FROM v_customer_debt_summary ds
       LEFT JOIN orders o ON ds.customer_id = o.customer_id
       ${where}
       GROUP BY ds.customer_id, ds.name, ds.phone, ds.email, ds.address, ds.credit_limit, ds.current_debt, ds.remaining_credit, ds.next_due_date, ds.overdue_amount, ds.debt_status
       ORDER BY ds.overdue_amount DESC, ds.current_debt DESC, ds.name`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get customers error:");
  }
});

router.get("/customers/debt", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT *
       FROM v_customer_debt_summary
       WHERE current_debt > 0
       ORDER BY overdue_amount DESC, current_debt DESC, name`
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get customer debt error:");
  }
});

router.get("/customers/:customer_id/orders", async (req, res) => {
  try {
    const [[customer]] = await db.execute(
      `SELECT customer_id, name, phone, email, credit_limit, current_debt
       FROM customers
       WHERE customer_id = ?`,
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
        CASE
          WHEN o.payment_method = 'debt' AND o.payment_status <> 'paid' AND o.debt_due_date < CURRENT_DATE THEN DATEDIFF(CURRENT_DATE, o.debt_due_date)
          ELSE 0
        END AS days_overdue,
        o.status,
        sales.full_name AS sales_rep_name,
        tech.full_name AS tech_name,
        COUNT(od.variant_id) AS item_count
       FROM orders o
       LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
       LEFT JOIN employees tech ON o.tech_id = tech.employee_id
       LEFT JOIN orderdetails od ON o.order_id = od.order_id
       WHERE o.customer_id = ?
       GROUP BY o.order_id, o.order_date, o.total_amount, o.payment_method, o.payment_status, o.debt_due_date, o.status, sales.full_name, tech.full_name
       ORDER BY o.order_date DESC`,
      [req.params.customer_id]
    );

    res.json({ customer, orders });
  } catch (err) {
    handleDbError(res, err, "Get customer order history error:");
  }
});

router.get("/orders", async (req, res) => {
  const search = cleanText(req.query.search);
  const status = cleanText(req.query.status);
  const from = cleanText(req.query.from);
  const to = cleanText(req.query.to);
  const limit = toPositiveInt(req.query.limit, 50, 100);
  const params = [];

  let where = "WHERE 1 = 1";

  if (search) {
    where += " AND (CAST(o.order_id AS CHAR) LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)";
    params.push(likeTerm(search), likeTerm(search), likeTerm(search), likeTerm(search));
  }

  if (status) {
    where += " AND o.status = ?";
    params.push(status);
  }

  if (from) {
    where += " AND DATE(o.order_date) >= ?";
    params.push(from);
  }

  if (to) {
    where += " AND DATE(o.order_date) <= ?";
    params.push(to);
  }

  try {
    const [rows] = await db.execute(
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
        sales.full_name AS sales_rep_name,
        tech.full_name AS tech_name,
        s.shift_name,
        COUNT(od.variant_id) AS item_count
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
       LEFT JOIN employees tech ON o.tech_id = tech.employee_id
       LEFT JOIN shifts s ON o.shift_id = s.shift_id
       LEFT JOIN orderdetails od ON o.order_id = od.order_id
       ${where}
       GROUP BY o.order_id, o.order_date, o.total_amount, o.payment_method, o.payment_status, o.debt_due_date, o.status, c.customer_id, c.name, c.phone, sales.full_name, tech.full_name, s.shift_name
       ORDER BY o.order_date DESC
       LIMIT ${limit}`,
      params
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get orders error:");
  }
});

router.get("/orders/:order_id", async (req, res) => {
  try {
    const [[order]] = await db.execute(
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
        sales.full_name AS sales_rep_name,
        tech.full_name AS tech_name,
        s.shift_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
       LEFT JOIN employees tech ON o.tech_id = tech.employee_id
       LEFT JOIN shifts s ON o.shift_id = s.shift_id
       WHERE o.order_id = ?`,
      [req.params.order_id]
    );

    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const [details] = await db.execute(
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
      [req.params.order_id]
    );

    res.json({ order, details });
  } catch (err) {
    handleDbError(res, err, "Get order detail error:");
  }
});

router.get("/reports/revenue", async (req, res) => {
  const group = req.query.group === "monthly" ? "monthly" : "daily";

  try {
    const sql =
      group === "monthly"
        ? `SELECT DATE_FORMAT(order_date, '%Y-%m') AS period, COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS revenue
           FROM orders
           WHERE status <> 'cancelled'
           GROUP BY DATE_FORMAT(order_date, '%Y-%m')
           ORDER BY period DESC
           LIMIT 12`
        : `SELECT DATE(order_date) AS period, COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS revenue
           FROM orders
           WHERE status <> 'cancelled'
           GROUP BY DATE(order_date)
           ORDER BY period DESC
           LIMIT 30`;

    const [rows] = await db.execute(sql);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get revenue report error:");
  }
});

router.get("/reports/top-products", async (req, res) => {
  const limit = toPositiveInt(req.query.limit, 5, 20);

  try {
    const [rows] = await db.execute(
      `SELECT
        pv.variant_id,
        pv.sku_code,
        b.name AS brand_name,
        pl.name AS line_name,
        bt.base_name,
        pv.volume,
        COALESCE(SUM(od.quantity), 0) AS sold_quantity,
        COALESCE(SUM(od.quantity * od.price_at_sale), 0) AS revenue
       FROM orderdetails od
       JOIN orders o ON od.order_id = o.order_id AND o.status <> 'cancelled'
       JOIN productvariants pv ON od.variant_id = pv.variant_id
       JOIN basetypes bt ON pv.base_id = bt.base_id
       JOIN productlines pl ON bt.line_id = pl.line_id
       JOIN brands b ON pl.brand_id = b.brand_id
       GROUP BY pv.variant_id, pv.sku_code, b.name, pl.name, bt.base_name, pv.volume
       ORDER BY sold_quantity DESC, revenue DESC
       LIMIT ${limit}`
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get top products report error:");
  }
});

router.get("/reports/top-colors", async (req, res) => {
  const limit = toPositiveInt(req.query.limit, 5, 20);

  try {
    const [rows] = await db.execute(
      `SELECT
        cs.color_id,
        cs.color_code,
        cs.color_name,
        COALESCE(SUM(od.quantity), 0) AS mixed_quantity,
        COALESCE(SUM(od.quantity * od.price_at_sale), 0) AS revenue
       FROM orderdetails od
       JOIN orders o ON od.order_id = o.order_id AND o.status <> 'cancelled'
       JOIN colorsystem cs ON od.color_id = cs.color_id
       GROUP BY cs.color_id, cs.color_code, cs.color_name
       ORDER BY mixed_quantity DESC, revenue DESC
       LIMIT ${limit}`
    );

    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get top colors report error:");
  }
});

module.exports = router;
