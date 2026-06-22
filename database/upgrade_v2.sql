USE `khanhpaintdealerdatabase`;

-- Chạy file này SAU khanhpaintdatabasewithdata.sql.
-- V2.1: migration idempotent, có thể chạy lại nhiều lần.
-- Nâng cấp nghiệp vụ: hoàn kho khi hủy đơn, created_at/updated_at, kiểm tra vai trò/ca làm,
-- nhật ký biến động kho, payment/công nợ, view báo cáo và trigger kiểm soát dữ liệu.

SET FOREIGN_KEY_CHECKS = 0;

-- Chuẩn hóa dữ liệu demo bị trùng để có thể thêm UNIQUE KEY.
UPDATE basetypes
SET base_name = 'Base C',
    description = 'Là sơn gốc có hàm lượng pigment trắng thấp, chuyên dùng pha màu đậm hoặc màu có độ bão hòa cao.'
WHERE base_id = 3 AND base_name = 'Base B';

UPDATE productlines
SET name = 'Jotashield Bền Màu Toàn Diện Cao Cấp'
WHERE line_id = 2 AND name = 'Jotashield Bền Màu Toàn Diện';

SET FOREIGN_KEY_CHECKS = 1;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_add_column_if_not_exists$$
CREATE PROCEDURE sp_add_column_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS sp_add_unique_if_not_exists$$
CREATE PROCEDURE sp_add_unique_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_constraint_name VARCHAR(64),
  IN p_columns TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND CONSTRAINT_NAME = p_constraint_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD CONSTRAINT `', p_constraint_name, '` UNIQUE (', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS sp_add_check_if_not_exists$$
CREATE PROCEDURE sp_add_check_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_constraint_name VARCHAR(64),
  IN p_check_expression TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND CONSTRAINT_NAME = p_constraint_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD CONSTRAINT `', p_constraint_name, '` CHECK (', p_check_expression, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS sp_add_index_if_not_exists$$
CREATE PROCEDURE sp_add_index_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_columns TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD INDEX `', p_index_name, '` (', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- Cột nghiệp vụ bổ sung cho Orders.
CALL sp_add_column_if_not_exists('orders', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL sp_add_column_if_not_exists('orders', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL sp_add_column_if_not_exists('orders', 'cancelled_at', '`cancelled_at` DATETIME NULL');
CALL sp_add_column_if_not_exists('orders', 'inventory_restored', '`inventory_restored` TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_not_exists('orders', 'paid_amount', '`paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00');
CALL sp_add_column_if_not_exists('orders', 'payment_status', '`payment_status` VARCHAR(20) NOT NULL DEFAULT ''unpaid''');

ALTER TABLE orders MODIFY status varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending';

-- Bổ sung ràng buộc duy nhất.
CALL sp_add_unique_if_not_exists('brands', 'uk_brands_name', '`name`');
CALL sp_add_unique_if_not_exists('basetypes', 'uk_basetypes_name', '`base_name`');
CALL sp_add_unique_if_not_exists('colorants', 'uk_colorants_name', '`colorant_name`');
CALL sp_add_unique_if_not_exists('colorsystem', 'uk_colorsystem_code', '`color_code`');
CALL sp_add_unique_if_not_exists('customers', 'uk_customers_email', '`email`');
CALL sp_add_unique_if_not_exists('productvariants', 'uk_productvariants_sku', '`sku_code`');
CALL sp_add_unique_if_not_exists('jobs', 'uk_jobs_title', '`job_title`');

-- Bổ sung CHECK CONSTRAINT cho dữ liệu số và trạng thái.
CALL sp_add_check_if_not_exists('colorants', 'chk_colorants_stock_nonnegative', 'stock_ml >= 0');
CALL sp_add_check_if_not_exists('colorants', 'chk_colorants_price_nonnegative', 'unit_price_per_ml >= 0');
CALL sp_add_check_if_not_exists('colorsystem_colorants', 'chk_formula_amount_positive', 'amount_ml > 0');
CALL sp_add_check_if_not_exists('customers', 'chk_customers_credit_nonnegative', 'credit_limit >= 0');
CALL sp_add_check_if_not_exists('customers', 'chk_customers_debt_nonnegative', 'current_debt >= 0');
CALL sp_add_check_if_not_exists('customers', 'chk_customers_debt_limit', 'current_debt <= credit_limit OR credit_limit = 0');
CALL sp_add_check_if_not_exists('jobs', 'chk_jobs_salary_nonnegative', '(min_salary IS NULL OR min_salary >= 0) AND (max_salary IS NULL OR max_salary >= 0)');
CALL sp_add_check_if_not_exists('jobs', 'chk_jobs_salary_range', 'min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary');
CALL sp_add_check_if_not_exists('productvariants', 'chk_variants_price_nonnegative', 'unit_price >= 0');
CALL sp_add_check_if_not_exists('productvariants', 'chk_variants_stock_nonnegative', 'stock_quantity >= 0');
CALL sp_add_check_if_not_exists('orders', 'chk_orders_total_nonnegative', 'total_amount >= 0');
CALL sp_add_check_if_not_exists('orders', 'chk_orders_status', 'status IN (''pending'', ''confirmed'', ''mixing'', ''completed'', ''cancelled'')');
CALL sp_add_check_if_not_exists('orders', 'chk_orders_paid_nonnegative', 'paid_amount >= 0');
CALL sp_add_check_if_not_exists('orders', 'chk_orders_paid_not_over_total', 'paid_amount <= total_amount');
CALL sp_add_check_if_not_exists('orders', 'chk_orders_inventory_restored', 'inventory_restored IN (0, 1)');
CALL sp_add_check_if_not_exists('orders', 'chk_orders_payment_status', 'payment_status IN (''unpaid'', ''partial'', ''paid'')');
CALL sp_add_check_if_not_exists('orderdetails', 'chk_orderdetails_quantity_positive', 'quantity > 0');
CALL sp_add_check_if_not_exists('orderdetails', 'chk_orderdetails_price_nonnegative', 'price_at_sale >= 0');

CALL sp_add_index_if_not_exists('orders', 'idx_orders_created_at', '`created_at`');
CALL sp_add_index_if_not_exists('orders', 'idx_orders_status', '`status`');
CALL sp_add_index_if_not_exists('customers', 'idx_customers_debt', '`current_debt`');

-- Bảng nhật ký biến động kho: mọi lần trigger trừ/hoàn kho đều được ghi lại.
CREATE TABLE IF NOT EXISTS inventory_movements (
  movement_id BIGINT NOT NULL AUTO_INCREMENT,
  inventory_type VARCHAR(20) NOT NULL,
  order_id INT NULL,
  variant_id INT NULL,
  colorant_id INT NULL,
  movement_type VARCHAR(50) NOT NULL,
  quantity_delta DECIMAL(14,2) NOT NULL,
  before_quantity DECIMAL(14,2) NOT NULL,
  after_quantity DECIMAL(14,2) NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (movement_id),
  KEY idx_inventory_movements_order (order_id),
  KEY idx_inventory_movements_variant (variant_id),
  KEY idx_inventory_movements_colorant (colorant_id),
  CONSTRAINT fk_inventory_movements_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_movements_variant FOREIGN KEY (variant_id) REFERENCES productvariants(variant_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_movements_colorant FOREIGN KEY (colorant_id) REFERENCES colorants(colorant_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_inventory_movements_type CHECK (inventory_type IN ('base', 'colorant')),
  CONSTRAINT chk_inventory_movements_after_nonnegative CHECK (after_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng thanh toán để hoàn thiện nghiệp vụ công nợ khách hàng.
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  note VARCHAR(255) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_payments_order (order_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_payments_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_payments_method CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Đồng bộ trạng thái thanh toán/công nợ cho dữ liệu cũ.
UPDATE orders o
LEFT JOIN (
  SELECT order_id, COALESCE(SUM(amount), 0) AS total_paid
  FROM payments
  GROUP BY order_id
) p ON o.order_id = p.order_id
SET o.paid_amount = COALESCE(p.total_paid, 0),
    o.payment_status = CASE
      WHEN COALESCE(p.total_paid, 0) <= 0 THEN 'unpaid'
      WHEN COALESCE(p.total_paid, 0) >= o.total_amount THEN 'paid'
      ELSE 'partial'
    END;

UPDATE customers c
SET current_debt = COALESCE((
  SELECT SUM(GREATEST(o.total_amount - o.paid_amount, 0))
  FROM orders o
  WHERE o.customer_id = c.customer_id
    AND o.status = 'completed'
), 0);

-- View phục vụ dashboard và thuyết trình.
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT pv.variant_id, pv.sku_code, pv.volume, pv.unit_price, pv.stock_quantity, pv.warehouse_location,
       bt.base_id, bt.base_name, pl.line_id, pl.name AS line_name, pl.is_interior,
       br.brand_id, br.name AS brand_name
FROM productvariants pv
JOIN basetypes bt ON pv.base_id = bt.base_id
JOIN productlines pl ON pv.line_id = pl.line_id
JOIN brands br ON pl.brand_id = br.brand_id;

CREATE OR REPLACE VIEW v_color_formula AS
SELECT cs.color_id, cs.color_code, cs.color_name, bt.base_name,
       c.colorant_id, c.colorant_name, f.amount_ml, c.stock_ml
FROM colorsystem cs
JOIN basetypes bt ON cs.base_id = bt.base_id
JOIN colorsystem_colorants f ON cs.color_id = f.color_id
JOIN colorants c ON f.colorant_id = c.colorant_id;

CREATE OR REPLACE VIEW v_order_trace AS
SELECT o.order_id, o.created_at, o.status, o.total_amount, o.paid_amount, o.payment_status,
       c.name AS customer_name, c.current_debt, c.credit_limit,
       sales.full_name AS sales_rep_name,
       tech.full_name AS tech_name,
       s.shift_name,
       br.name AS brand_name,
       pl.name AS line_name,
       pv.sku_code,
       bt.base_name,
       cs.color_code,
       cs.color_name,
       od.quantity,
       od.price_at_sale
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
LEFT JOIN employees tech ON o.tech_id = tech.employee_id
LEFT JOIN shifts s ON o.shift_id = s.shift_id
JOIN orderdetails od ON o.order_id = od.order_id
JOIN productvariants pv ON od.variant_id = pv.variant_id
JOIN productlines pl ON pv.line_id = pl.line_id
JOIN brands br ON pl.brand_id = br.brand_id
JOIN basetypes bt ON pv.base_id = bt.base_id
JOIN colorsystem cs ON od.color_id = cs.color_id;

CREATE OR REPLACE VIEW v_inventory_movements AS
SELECT im.movement_id, im.created_at, im.inventory_type, im.movement_type, im.order_id,
       im.quantity_delta, im.before_quantity, im.after_quantity, im.note,
       pv.sku_code, c.colorant_name
FROM inventory_movements im
LEFT JOIN productvariants pv ON im.variant_id = pv.variant_id
LEFT JOIN colorants c ON im.colorant_id = c.colorant_id;

CREATE OR REPLACE VIEW v_customer_debt AS
SELECT c.customer_id, c.name, c.phone, c.email, c.credit_limit, c.current_debt,
       CASE
         WHEN c.credit_limit = 0 THEN 'unlimited'
         WHEN c.current_debt > c.credit_limit THEN 'over_limit'
         WHEN c.current_debt >= c.credit_limit * 0.8 THEN 'near_limit'
         ELSE 'normal'
       END AS debt_status
FROM customers c;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_orders_bi_business_rules$$
CREATE TRIGGER trg_orders_bi_business_rules
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  DECLARE v_valid INT DEFAULT 0;
  DECLARE v_working_date DATE;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    SET NEW.status = 'pending';
  END IF;

  IF NEW.paid_amount IS NULL THEN
    SET NEW.paid_amount = 0;
  END IF;

  IF NEW.payment_status IS NULL OR NEW.payment_status = '' THEN
    SET NEW.payment_status = CASE
      WHEN NEW.paid_amount <= 0 THEN 'unpaid'
      WHEN NEW.paid_amount >= NEW.total_amount THEN 'paid'
      ELSE 'partial'
    END;
  END IF;

  IF NEW.sales_rep_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_valid
    FROM employees e
    LEFT JOIN jobs j ON e.job_id = j.job_id
    WHERE e.employee_id = NEW.sales_rep_id
      AND (e.role = 'admin' OR j.job_title LIKE '%Bán%' OR j.job_title LIKE '%Sales%');
    IF v_valid = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sales_rep_id phải là nhân viên bán hàng hoặc quản trị viên';
    END IF;
  END IF;

  IF NEW.tech_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_valid
    FROM employees e
    LEFT JOIN jobs j ON e.job_id = j.job_id
    WHERE e.employee_id = NEW.tech_id
      AND (e.role = 'admin' OR j.job_title LIKE '%Kỹ thuật%' OR j.job_title LIKE '%Pha màu%' OR j.job_title LIKE '%Ky thuat%');
    IF v_valid = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tech_id phải là kỹ thuật viên pha màu hoặc quản trị viên';
    END IF;
  END IF;

  IF NEW.shift_id IS NOT NULL THEN
    SET v_working_date = DATE(COALESCE(NEW.created_at, NOW()));

    IF NEW.sales_rep_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_valid
      FROM employees_shifts
      WHERE employee_id = NEW.sales_rep_id
        AND shift_id = NEW.shift_id
        AND working_date = v_working_date;
      IF v_valid = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên bán hàng chưa được phân vào ca làm của ngày tạo đơn';
      END IF;
    END IF;

    IF NEW.tech_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_valid
      FROM employees_shifts
      WHERE employee_id = NEW.tech_id
        AND shift_id = NEW.shift_id
        AND working_date = v_working_date;
      IF v_valid = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kỹ thuật viên chưa được phân vào ca làm của ngày tạo đơn';
      END IF;
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orders_bu_business_rules$$
CREATE TRIGGER trg_orders_bu_business_rules
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  DECLARE v_valid INT DEFAULT 0;
  DECLARE v_working_date DATE;
  DECLARE v_unpaid DECIMAL(14,2) DEFAULT 0;
  DECLARE v_credit_limit DECIMAL(14,2) DEFAULT 0;
  DECLARE v_current_debt DECIMAL(14,2) DEFAULT 0;

  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn đã hủy không được mở lại để tránh sai lệch tồn kho';
  END IF;

  IF OLD.status = 'completed' AND NEW.status NOT IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn đã hoàn tất không được chuyển ngược trạng thái';
  END IF;

  IF NEW.paid_amount < 0 OR NEW.paid_amount > NEW.total_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền đã thanh toán không hợp lệ';
  END IF;

  SET NEW.payment_status = CASE
    WHEN NEW.paid_amount <= 0 THEN 'unpaid'
    WHEN NEW.paid_amount >= NEW.total_amount THEN 'paid'
    ELSE 'partial'
  END;

  IF COALESCE(NEW.sales_rep_id, -1) <> COALESCE(OLD.sales_rep_id, -1)
     OR COALESCE(NEW.tech_id, -1) <> COALESCE(OLD.tech_id, -1)
     OR COALESCE(NEW.shift_id, -1) <> COALESCE(OLD.shift_id, -1)
     OR (OLD.status <> 'completed' AND NEW.status = 'completed') THEN

    IF NEW.sales_rep_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_valid
      FROM employees e
      LEFT JOIN jobs j ON e.job_id = j.job_id
      WHERE e.employee_id = NEW.sales_rep_id
        AND (e.role = 'admin' OR j.job_title LIKE '%Bán%' OR j.job_title LIKE '%Sales%');
      IF v_valid = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên bán hàng phải thuộc vị trí Bán hàng hoặc quản trị viên';
      END IF;
    END IF;

    IF NEW.tech_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_valid
      FROM employees e
      LEFT JOIN jobs j ON e.job_id = j.job_id
      WHERE e.employee_id = NEW.tech_id
        AND (e.role = 'admin' OR j.job_title LIKE '%Kỹ thuật%' OR j.job_title LIKE '%Pha màu%' OR j.job_title LIKE '%Ky thuat%');
      IF v_valid = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kỹ thuật viên phải thuộc vị trí Kỹ thuật/Pha màu hoặc quản trị viên';
      END IF;
    END IF;

    IF NEW.status = 'completed' AND (NEW.sales_rep_id IS NULL OR NEW.tech_id IS NULL OR NEW.shift_id IS NULL) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hoàn tất phải có nhân viên bán hàng, kỹ thuật viên và ca làm';
    END IF;

    IF NEW.shift_id IS NOT NULL THEN
      SET v_working_date = DATE(NEW.created_at);

      IF NEW.sales_rep_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_valid
        FROM employees_shifts
        WHERE employee_id = NEW.sales_rep_id
          AND shift_id = NEW.shift_id
          AND working_date = v_working_date;
        IF v_valid = 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên bán hàng chưa được phân vào ca làm của ngày tạo đơn';
        END IF;
      END IF;

      IF NEW.tech_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_valid
        FROM employees_shifts
        WHERE employee_id = NEW.tech_id
          AND shift_id = NEW.shift_id
          AND working_date = v_working_date;
        IF v_valid = 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kỹ thuật viên chưa được phân vào ca làm của ngày tạo đơn';
        END IF;
      END IF;
    END IF;
  END IF;

  IF OLD.status <> 'completed' AND NEW.status = 'completed' THEN
    SET v_unpaid = GREATEST(NEW.total_amount - NEW.paid_amount, 0);

    SELECT credit_limit, current_debt INTO v_credit_limit, v_current_debt
    FROM customers
    WHERE customer_id = NEW.customer_id;

    IF v_credit_limit > 0 AND v_current_debt + v_unpaid > v_credit_limit THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khách hàng vượt hạn mức công nợ, không thể hoàn tất đơn';
    END IF;

    UPDATE customers
    SET current_debt = current_debt + v_unpaid
    WHERE customer_id = NEW.customer_id;
  END IF;

  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    IF OLD.paid_amount > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể hủy đơn đã có thanh toán; cần xử lý hoàn tiền trước';
    END IF;

    IF OLD.status = 'completed' THEN
      UPDATE customers
      SET current_debt = GREATEST(0, current_debt - GREATEST(OLD.total_amount - OLD.paid_amount, 0))
      WHERE customer_id = OLD.customer_id;
    END IF;

    IF OLD.inventory_restored = 0 THEN
      INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
      SELECT 'base', OLD.order_id, pv.variant_id, NULL, 'order_cancel_restore', od.quantity,
             pv.stock_quantity, pv.stock_quantity + od.quantity,
             'Hoàn kho sơn gốc khi hủy đơn'
      FROM orderdetails od
      JOIN productvariants pv ON od.variant_id = pv.variant_id
      WHERE od.order_id = OLD.order_id;

      INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
      SELECT 'colorant', OLD.order_id, NULL, c.colorant_id, 'order_cancel_restore', f.amount_ml * od.quantity,
             c.stock_ml, c.stock_ml + (f.amount_ml * od.quantity),
             'Hoàn kho tinh màu khi hủy đơn'
      FROM orderdetails od
      JOIN colorsystem_colorants f ON od.color_id = f.color_id
      JOIN colorants c ON f.colorant_id = c.colorant_id
      WHERE od.order_id = OLD.order_id;

      UPDATE productvariants pv
      JOIN orderdetails od ON pv.variant_id = od.variant_id
      SET pv.stock_quantity = pv.stock_quantity + od.quantity
      WHERE od.order_id = OLD.order_id;

      UPDATE colorants c
      JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
      JOIN orderdetails od ON f.color_id = od.color_id
      SET c.stock_ml = c.stock_ml + (f.amount_ml * od.quantity)
      WHERE od.order_id = OLD.order_id;

      SET NEW.inventory_restored = 1;
    END IF;

    SET NEW.cancelled_at = NOW();
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_bi_validate$$
CREATE TRIGGER trg_orderdetails_bi_validate
BEFORE INSERT ON orderdetails
FOR EACH ROW
BEGIN
  DECLARE v_stock INT DEFAULT 0;
  DECLARE v_variant_base INT DEFAULT NULL;
  DECLARE v_color_base INT DEFAULT NULL;
  DECLARE v_missing_colorants INT DEFAULT 0;
  DECLARE v_order_status VARCHAR(100) DEFAULT NULL;

  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_status IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể thêm chi tiết vào đơn đã hoàn tất hoặc đã hủy';
  END IF;

  SELECT stock_quantity, base_id INTO v_stock, v_variant_base
  FROM productvariants
  WHERE variant_id = NEW.variant_id;

  SELECT base_id INTO v_color_base
  FROM colorsystem
  WHERE color_id = NEW.color_id;

  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sản phẩm phải lớn hơn 0';
  END IF;

  IF v_stock < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho sơn gốc không đủ';
  END IF;

  IF v_variant_base <> v_color_base THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không tương thích với base của sản phẩm';
  END IF;

  SELECT COUNT(*) INTO v_missing_colorants
  FROM colorsystem_colorants f
  JOIN colorants c ON f.colorant_id = c.colorant_id
  WHERE f.color_id = NEW.color_id
    AND c.stock_ml < f.amount_ml * NEW.quantity;

  IF v_missing_colorants > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho tinh màu không đủ để pha màu';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_ai_apply_inventory$$
CREATE TRIGGER trg_orderdetails_ai_apply_inventory
AFTER INSERT ON orderdetails
FOR EACH ROW
BEGIN
  INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'base', NEW.order_id, NEW.variant_id, NULL, 'order_detail_insert', -NEW.quantity,
         stock_quantity, stock_quantity - NEW.quantity,
         'Trừ tồn kho sơn gốc khi thêm chi tiết đơn hàng'
  FROM productvariants
  WHERE variant_id = NEW.variant_id;

  INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'colorant', NEW.order_id, NULL, c.colorant_id, 'order_detail_insert', -(f.amount_ml * NEW.quantity),
         c.stock_ml, c.stock_ml - (f.amount_ml * NEW.quantity),
         'Trừ tinh màu theo công thức pha'
  FROM colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  WHERE f.color_id = NEW.color_id;

  UPDATE productvariants
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE variant_id = NEW.variant_id;

  UPDATE colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  SET c.stock_ml = c.stock_ml - (f.amount_ml * NEW.quantity)
  WHERE f.color_id = NEW.color_id;

  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * price_at_sale), 0)
    FROM orderdetails
    WHERE order_id = NEW.order_id
  )
  WHERE order_id = NEW.order_id;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_bu_validate$$
CREATE TRIGGER trg_orderdetails_bu_validate
BEFORE UPDATE ON orderdetails
FOR EACH ROW
BEGIN
  DECLARE v_stock INT DEFAULT 0;
  DECLARE v_extra INT DEFAULT 0;
  DECLARE v_missing_colorants INT DEFAULT 0;
  DECLARE v_order_status VARCHAR(100) DEFAULT NULL;

  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_status IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể sửa chi tiết đơn đã hoàn tất hoặc đã hủy';
  END IF;

  IF NEW.variant_id <> OLD.variant_id OR NEW.color_id <> OLD.color_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi variant hoặc màu trên dòng chi tiết; hãy xóa và thêm lại';
  END IF;

  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sản phẩm phải lớn hơn 0';
  END IF;

  SET v_extra = NEW.quantity - OLD.quantity;
  IF v_extra > 0 THEN
    SELECT stock_quantity INTO v_stock FROM productvariants WHERE variant_id = NEW.variant_id;
    IF v_stock < v_extra THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho sơn gốc không đủ cho phần tăng thêm';
    END IF;

    SELECT COUNT(*) INTO v_missing_colorants
    FROM colorsystem_colorants f
    JOIN colorants c ON f.colorant_id = c.colorant_id
    WHERE f.color_id = NEW.color_id
      AND c.stock_ml < f.amount_ml * v_extra;

    IF v_missing_colorants > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho tinh màu không đủ cho phần tăng thêm';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_au_apply_inventory$$
CREATE TRIGGER trg_orderdetails_au_apply_inventory
AFTER UPDATE ON orderdetails
FOR EACH ROW
BEGIN
  DECLARE v_diff INT DEFAULT 0;
  SET v_diff = NEW.quantity - OLD.quantity;

  IF v_diff <> 0 THEN
    INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
    SELECT 'base', NEW.order_id, NEW.variant_id, NULL, 'order_detail_update', -v_diff,
           stock_quantity, stock_quantity - v_diff,
           'Điều chỉnh tồn kho sơn gốc khi sửa số lượng'
    FROM productvariants
    WHERE variant_id = NEW.variant_id;

    INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
    SELECT 'colorant', NEW.order_id, NULL, c.colorant_id, 'order_detail_update', -(f.amount_ml * v_diff),
           c.stock_ml, c.stock_ml - (f.amount_ml * v_diff),
           'Điều chỉnh tinh màu khi sửa số lượng'
    FROM colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    WHERE f.color_id = NEW.color_id;

    UPDATE productvariants
    SET stock_quantity = stock_quantity - v_diff
    WHERE variant_id = NEW.variant_id;

    UPDATE colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    SET c.stock_ml = c.stock_ml - (f.amount_ml * v_diff)
    WHERE f.color_id = NEW.color_id;
  END IF;

  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * price_at_sale), 0)
    FROM orderdetails
    WHERE order_id = NEW.order_id
  )
  WHERE order_id = NEW.order_id;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_bd_validate$$
CREATE TRIGGER trg_orderdetails_bd_validate
BEFORE DELETE ON orderdetails
FOR EACH ROW
BEGIN
  DECLARE v_order_status VARCHAR(100) DEFAULT NULL;
  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = OLD.order_id;

  IF v_order_status IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể xóa chi tiết đơn đã hoàn tất hoặc đã hủy';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_ad_restore_inventory$$
CREATE TRIGGER trg_orderdetails_ad_restore_inventory
AFTER DELETE ON orderdetails
FOR EACH ROW
BEGIN
  INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'base', OLD.order_id, OLD.variant_id, NULL, 'order_detail_delete', OLD.quantity,
         stock_quantity, stock_quantity + OLD.quantity,
         'Hoàn kho sơn gốc khi xóa chi tiết đơn hàng'
  FROM productvariants
  WHERE variant_id = OLD.variant_id;

  INSERT INTO inventory_movements (inventory_type, order_id, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'colorant', OLD.order_id, NULL, c.colorant_id, 'order_detail_delete', f.amount_ml * OLD.quantity,
         c.stock_ml, c.stock_ml + (f.amount_ml * OLD.quantity),
         'Hoàn kho tinh màu khi xóa chi tiết đơn hàng'
  FROM colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  WHERE f.color_id = OLD.color_id;

  UPDATE productvariants
  SET stock_quantity = stock_quantity + OLD.quantity
  WHERE variant_id = OLD.variant_id;

  UPDATE colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  SET c.stock_ml = c.stock_ml + (f.amount_ml * OLD.quantity)
  WHERE f.color_id = OLD.color_id;

  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * price_at_sale), 0)
    FROM orderdetails
    WHERE order_id = OLD.order_id
  )
  WHERE order_id = OLD.order_id;
END$$

DROP TRIGGER IF EXISTS trg_payments_bi_validate$$
CREATE TRIGGER trg_payments_bi_validate
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
  DECLARE v_total DECIMAL(14,2) DEFAULT 0;
  DECLARE v_paid DECIMAL(14,2) DEFAULT 0;
  DECLARE v_status VARCHAR(100) DEFAULT NULL;

  SELECT total_amount, paid_amount, status INTO v_total, v_paid, v_status
  FROM orders
  WHERE order_id = NEW.order_id;

  IF NEW.amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền thanh toán phải lớn hơn 0';
  END IF;

  IF v_status = 'cancelled' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể thanh toán cho đơn đã hủy';
  END IF;

  IF v_paid + NEW.amount > v_total THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền thanh toán vượt tổng giá trị đơn hàng';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_payments_ai_apply_debt$$
CREATE TRIGGER trg_payments_ai_apply_debt
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  UPDATE orders
  SET paid_amount = paid_amount + NEW.amount
  WHERE order_id = NEW.order_id;

  UPDATE customers c
  JOIN orders o ON c.customer_id = o.customer_id
  SET c.current_debt = GREATEST(0, c.current_debt - NEW.amount)
  WHERE o.order_id = NEW.order_id
    AND o.status = 'completed';
END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS sp_add_column_if_not_exists;
DROP PROCEDURE IF EXISTS sp_add_unique_if_not_exists;
DROP PROCEDURE IF EXISTS sp_add_check_if_not_exists;
DROP PROCEDURE IF EXISTS sp_add_index_if_not_exists;
