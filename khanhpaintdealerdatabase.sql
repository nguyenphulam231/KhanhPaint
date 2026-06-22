CREATE DATABASE IF NOT EXISTS `khanhpaintdealerdatabase`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `khanhpaintdealerdatabase`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TRIGGER IF EXISTS `trg_orders_before_insert`;
DROP TRIGGER IF EXISTS `trg_orders_before_update`;
DROP TRIGGER IF EXISTS `trg_orders_after_update`;
DROP TRIGGER IF EXISTS `trg_orderdetails_before_insert`;
DROP TRIGGER IF EXISTS `trg_orderdetails_after_insert`;
DROP TRIGGER IF EXISTS `trg_orderdetails_before_update`;
DROP TRIGGER IF EXISTS `trg_orderdetails_after_delete`;
DROP TRIGGER IF EXISTS `trg_debt_payments_before_insert`;
DROP TRIGGER IF EXISTS `trg_debt_payments_after_insert`;
DROP TRIGGER IF EXISTS `trg_debt_payments_before_update`;
DROP TRIGGER IF EXISTS `trg_debt_payments_before_delete`;
DROP VIEW IF EXISTS `v_overdue_debts`;
DROP VIEW IF EXISTS `v_customer_debt_summary`;
DROP VIEW IF EXISTS `v_order_summary`;
DROP VIEW IF EXISTS `v_product_inventory`;
DROP TABLE IF EXISTS `inventory_logs`;
DROP TABLE IF EXISTS `debt_payments`;
DROP TABLE IF EXISTS `orderdetails`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `employees_shifts`;
DROP TABLE IF EXISTS `colorsystem_colorants`;
DROP TABLE IF EXISTS `colorsystem`;
DROP TABLE IF EXISTS `colorants`;
DROP TABLE IF EXISTS `productvariants`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `basetypes`;
DROP TABLE IF EXISTS `productlines`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `shifts`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `brands`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `brands` (
  `brand_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `origin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `uk_brands_name` (`name`),
  CONSTRAINT `chk_brands_name_not_blank` CHECK (char_length(trim(`name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_salary` decimal(14,2) DEFAULT NULL,
  `max_salary` decimal(14,2) DEFAULT NULL,
  PRIMARY KEY (`job_id`),
  UNIQUE KEY `uk_jobs_title` (`job_title`),
  CONSTRAINT `chk_jobs_title_not_blank` CHECK (char_length(trim(`job_title`)) > 0),
  CONSTRAINT `chk_jobs_salary_nonnegative` CHECK ((`min_salary` IS NULL OR `min_salary` >= 0) AND (`max_salary` IS NULL OR `max_salary` >= 0)),
  CONSTRAINT `chk_jobs_salary_range` CHECK (`min_salary` IS NULL OR `max_salary` IS NULL OR `max_salary` >= `min_salary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
  `shift_id` int NOT NULL AUTO_INCREMENT,
  `shift_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`shift_id`),
  CONSTRAINT `chk_shifts_name_not_blank` CHECK (char_length(trim(`shift_name`)) > 0),
  CONSTRAINT `chk_shifts_time_range` CHECK (`end_time` > `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `address` text COLLATE utf8mb4_unicode_ci,
  `credit_limit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `current_debt` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uk_customers_email` (`email`),
  KEY `idx_customers_phone` (`phone`),
  KEY `idx_customers_debt` (`current_debt`),
  CONSTRAINT `chk_customers_name_not_blank` CHECK (char_length(trim(`name`)) > 0),
  CONSTRAINT `chk_customers_role` CHECK (`role` IN ('customer')),
  CONSTRAINT `chk_customers_credit_nonnegative` CHECK (`credit_limit` >= 0 AND `current_debt` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `productlines` (
  `line_id` int NOT NULL AUTO_INCREMENT,
  `brand_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_interior` tinyint(1) NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`line_id`),
  KEY `idx_productlines_brand_id` (`brand_id`),
  CONSTRAINT `fk_productlines_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_productlines_name_not_blank` CHECK (char_length(trim(`name`)) > 0),
  CONSTRAINT `chk_productlines_is_interior` CHECK (`is_interior` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `basetypes` (
  `base_id` int NOT NULL AUTO_INCREMENT,
  `line_id` int NOT NULL,
  `base_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coverage_rate` decimal(8,2) DEFAULT NULL,
  `drying_time` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gloss_level` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recommended_layers` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`base_id`),
  KEY `idx_basetypes_line_id` (`line_id`),
  CONSTRAINT `fk_basetypes_line` FOREIGN KEY (`line_id`) REFERENCES `productlines` (`line_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_basetypes_name_not_blank` CHECK (char_length(trim(`base_name`)) > 0),
  CONSTRAINT `chk_basetypes_coverage_positive` CHECK (`coverage_rate` IS NULL OR `coverage_rate` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_id` int DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'staff',
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `uk_employees_email` (`email`),
  KEY `idx_employees_job_id` (`job_id`),
  CONSTRAINT `fk_employees_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`job_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_employees_name_not_blank` CHECK (char_length(trim(`full_name`)) > 0),
  CONSTRAINT `chk_employees_email_not_blank` CHECK (char_length(trim(`email`)) > 0),
  CONSTRAINT `chk_employees_role` CHECK (`role` IN ('admin', 'staff'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `productvariants` (
  `variant_id` int NOT NULL AUTO_INCREMENT,
  `base_id` int NOT NULL,
  `volume` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `warehouse_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`variant_id`),
  UNIQUE KEY `uk_productvariants_sku` (`sku_code`),
  KEY `idx_productvariants_base_id` (`base_id`),
  KEY `idx_productvariants_stock` (`stock_quantity`),
  CONSTRAINT `fk_productvariants_base` FOREIGN KEY (`base_id`) REFERENCES `basetypes` (`base_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_productvariants_sku_not_blank` CHECK (char_length(trim(`sku_code`)) > 0),
  CONSTRAINT `chk_productvariants_price_stock` CHECK (`unit_price` >= 0 AND `stock_quantity` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `colorants` (
  `colorant_id` int NOT NULL AUTO_INCREMENT,
  `colorant_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stock_ml` decimal(12,2) NOT NULL DEFAULT '0.00',
  `unit_price_per_ml` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`colorant_id`),
  UNIQUE KEY `uk_colorants_name` (`colorant_name`),
  KEY `idx_colorants_stock` (`stock_ml`),
  CONSTRAINT `chk_colorants_name_not_blank` CHECK (char_length(trim(`colorant_name`)) > 0),
  CONSTRAINT `chk_colorants_stock_price` CHECK (`stock_ml` >= 0 AND `unit_price_per_ml` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `colorsystem` (
  `color_id` int NOT NULL AUTO_INCREMENT,
  `color_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_id` int NOT NULL,
  PRIMARY KEY (`color_id`),
  UNIQUE KEY `uk_colorsystem_code` (`color_code`),
  KEY `idx_colorsystem_base_id` (`base_id`),
  CONSTRAINT `fk_colorsystem_base` FOREIGN KEY (`base_id`) REFERENCES `basetypes` (`base_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_colorsystem_code_not_blank` CHECK (char_length(trim(`color_code`)) > 0),
  CONSTRAINT `chk_colorsystem_name_not_blank` CHECK (char_length(trim(`color_name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `colorsystem_colorants` (
  `color_id` int NOT NULL,
  `colorant_id` int NOT NULL,
  `amount_ml` decimal(12,2) NOT NULL,
  PRIMARY KEY (`color_id`, `colorant_id`),
  KEY `idx_csc_colorant_id` (`colorant_id`),
  CONSTRAINT `fk_csc_color` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_csc_colorant` FOREIGN KEY (`colorant_id`) REFERENCES `colorants` (`colorant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_csc_amount_positive` CHECK (`amount_ml` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees_shifts` (
  `employee_id` int NOT NULL,
  `shift_id` int NOT NULL,
  `working_date` date NOT NULL,
  PRIMARY KEY (`employee_id`, `shift_id`, `working_date`),
  KEY `idx_employees_shifts_shift_id` (`shift_id`),
  CONSTRAINT `fk_employees_shifts_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employees_shifts_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `sales_rep_id` int DEFAULT NULL,
  `tech_id` int DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `order_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paid',
  `debt_due_date` date DEFAULT NULL,
  `status` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  PRIMARY KEY (`order_id`),
  KEY `idx_orders_customer_id` (`customer_id`),
  KEY `idx_orders_sales_rep_id` (`sales_rep_id`),
  KEY `idx_orders_tech_id` (`tech_id`),
  KEY `idx_orders_shift_id` (`shift_id`),
  KEY `idx_orders_debt_due` (`payment_method`, `payment_status`, `debt_due_date`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_sales_rep` FOREIGN KEY (`sales_rep_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_tech` FOREIGN KEY (`tech_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_orders_total_nonnegative` CHECK (`total_amount` >= 0),
  CONSTRAINT `chk_orders_payment_method` CHECK (`payment_method` IN ('cash', 'debt')),
  CONSTRAINT `chk_orders_payment_status` CHECK (`payment_status` IN ('unpaid', 'partial', 'paid')),
  CONSTRAINT `chk_orders_status` CHECK (`status` IN ('pending', 'completed', 'cancelled')),
  CONSTRAINT `chk_orders_debt_due_date` CHECK (`payment_method` <> 'debt' OR `debt_due_date` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orderdetails` (
  `order_id` int NOT NULL,
  `variant_id` int NOT NULL,
  `color_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price_at_sale` decimal(14,2) NOT NULL,
  PRIMARY KEY (`order_id`, `variant_id`, `color_id`),
  KEY `idx_orderdetails_variant_id` (`variant_id`),
  KEY `idx_orderdetails_color_id` (`color_id`),
  CONSTRAINT `fk_orderdetails_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_orderdetails_variant` FOREIGN KEY (`variant_id`) REFERENCES `productvariants` (`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orderdetails_color` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_orderdetails_quantity_price` CHECK (`quantity` > 0 AND `price_at_sale` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `debt_payments` (
  `payment_id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `order_id` int NOT NULL,
  `employee_id` int DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`payment_id`),
  KEY `idx_debt_payments_customer_id` (`customer_id`),
  KEY `idx_debt_payments_order_id` (`order_id`),
  KEY `idx_debt_payments_employee_id` (`employee_id`),
  CONSTRAINT `fk_debt_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_debt_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_debt_payments_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_debt_payments_amount` CHECK (`amount` > 0),
  CONSTRAINT `chk_debt_payments_method` CHECK (`payment_method` IN ('cash', 'bank_transfer', 'e_wallet', 'other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `variant_id` int DEFAULT NULL,
  `colorant_id` int DEFAULT NULL,
  `movement_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_change` int DEFAULT NULL,
  `ml_change` decimal(12,2) DEFAULT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_inventory_logs_order_id` (`order_id`),
  KEY `idx_inventory_logs_variant_id` (`variant_id`),
  KEY `idx_inventory_logs_colorant_id` (`colorant_id`),
  CONSTRAINT `fk_inventory_logs_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_logs_variant` FOREIGN KEY (`variant_id`) REFERENCES `productvariants` (`variant_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_logs_colorant` FOREIGN KEY (`colorant_id`) REFERENCES `colorants` (`colorant_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_logs_type` CHECK (`movement_type` IN ('ORDER_PRODUCT_OUT', 'ORDER_COLORANT_OUT', 'ORDER_PRODUCT_RESTORE', 'ORDER_COLORANT_RESTORE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

CREATE TRIGGER `trg_orders_before_insert`
BEFORE INSERT ON `orders`
FOR EACH ROW
BEGIN
  IF NEW.order_date IS NULL THEN
    SET NEW.order_date = CURRENT_TIMESTAMP;
  END IF;

  IF NEW.payment_method = 'debt' THEN
    IF NEW.payment_status IS NULL OR NEW.payment_status = 'paid' THEN
      SET NEW.payment_status = 'unpaid';
    END IF;
    IF NEW.debt_due_date IS NULL THEN
      SET NEW.debt_due_date = DATE(NEW.order_date) + INTERVAL 15 DAY;
    END IF;
  ELSE
    SET NEW.payment_status = 'paid';
    SET NEW.debt_due_date = NULL;
  END IF;
END//

CREATE TRIGGER `trg_orders_before_update`
BEFORE UPDATE ON `orders`
FOR EACH ROW
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được khôi phục đơn hàng đã hủy vì tồn kho đã hoàn lại.';
  END IF;

  IF NEW.payment_method = 'debt' THEN
    IF NEW.debt_due_date IS NULL THEN
      SET NEW.debt_due_date = DATE(NEW.order_date) + INTERVAL 15 DAY;
    END IF;
    IF NEW.payment_status = 'paid' AND NEW.total_amount > COALESCE((SELECT SUM(amount) FROM debt_payments WHERE order_id = NEW.order_id), 0) THEN
      SET NEW.payment_status = CASE
        WHEN COALESCE((SELECT SUM(amount) FROM debt_payments WHERE order_id = NEW.order_id), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END;
    END IF;
  ELSE
    SET NEW.payment_status = 'paid';
    SET NEW.debt_due_date = NULL;
  END IF;
END//

CREATE TRIGGER `trg_orders_after_update`
AFTER UPDATE ON `orders`
FOR EACH ROW
BEGIN
  DECLARE v_paid_amount decimal(14,2) DEFAULT 0;
  DECLARE v_outstanding decimal(14,2) DEFAULT 0;

  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE productvariants pv
    JOIN orderdetails od ON pv.variant_id = od.variant_id
    SET pv.stock_quantity = pv.stock_quantity + od.quantity
    WHERE od.order_id = NEW.order_id;

    INSERT INTO inventory_logs (order_id, variant_id, movement_type, quantity_change, note)
    SELECT NEW.order_id, od.variant_id, 'ORDER_PRODUCT_RESTORE', od.quantity, 'Hoàn sơn gốc khi hủy đơn hàng'
    FROM orderdetails od
    WHERE od.order_id = NEW.order_id;

    UPDATE colorants c
    JOIN (
      SELECT csc.colorant_id, SUM(csc.amount_ml * od.quantity) AS restore_ml
      FROM orderdetails od
      JOIN colorsystem_colorants csc ON od.color_id = csc.color_id
      WHERE od.order_id = NEW.order_id
      GROUP BY csc.colorant_id
    ) x ON c.colorant_id = x.colorant_id
    SET c.stock_ml = c.stock_ml + x.restore_ml;

    INSERT INTO inventory_logs (order_id, colorant_id, movement_type, ml_change, note)
    SELECT NEW.order_id, csc.colorant_id, 'ORDER_COLORANT_RESTORE', SUM(csc.amount_ml * od.quantity), 'Hoàn tinh màu khi hủy đơn hàng'
    FROM orderdetails od
    JOIN colorsystem_colorants csc ON od.color_id = csc.color_id
    WHERE od.order_id = NEW.order_id
    GROUP BY csc.colorant_id;

    IF OLD.payment_method = 'debt' THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
      FROM debt_payments
      WHERE order_id = OLD.order_id;

      SET v_outstanding = GREATEST(OLD.total_amount - v_paid_amount, 0);

      UPDATE customers
      SET current_debt = GREATEST(current_debt - v_outstanding, 0)
      WHERE customer_id = OLD.customer_id;
    END IF;
  END IF;
END//

CREATE TRIGGER `trg_orderdetails_before_insert`
BEFORE INSERT ON `orderdetails`
FOR EACH ROW
BEGIN
  DECLARE v_order_count int DEFAULT 0;
  DECLARE v_variant_count int DEFAULT 0;
  DECLARE v_color_count int DEFAULT 0;
  DECLARE v_formula_count int DEFAULT 0;
  DECLARE v_insufficient_colorants int DEFAULT 0;
  DECLARE v_variant_base_id int DEFAULT NULL;
  DECLARE v_color_base_id int DEFAULT NULL;
  DECLARE v_stock_quantity int DEFAULT 0;
  DECLARE v_unit_price decimal(14,2) DEFAULT 0;
  DECLARE v_payment_method varchar(20) DEFAULT 'cash';
  DECLARE v_order_status varchar(100) DEFAULT 'completed';
  DECLARE v_customer_id int DEFAULT NULL;
  DECLARE v_credit_limit decimal(14,2) DEFAULT 0;
  DECLARE v_current_debt decimal(14,2) DEFAULT 0;
  DECLARE v_line_total decimal(14,2) DEFAULT 0;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng bán phải lớn hơn 0.';
  END IF;

  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hàng không tồn tại.';
  END IF;

  SELECT payment_method, status, customer_id
  INTO v_payment_method, v_order_status, v_customer_id
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_status = 'cancelled' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể thêm dòng vào đơn hàng đã hủy.';
  END IF;

  SELECT COUNT(*) INTO v_variant_count
  FROM productvariants
  WHERE variant_id = NEW.variant_id;

  IF v_variant_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product Variant không tồn tại.';
  END IF;

  SELECT base_id, stock_quantity, unit_price
  INTO v_variant_base_id, v_stock_quantity, v_unit_price
  FROM productvariants
  WHERE variant_id = NEW.variant_id;

  SELECT COUNT(*) INTO v_color_count
  FROM colorsystem
  WHERE color_id = NEW.color_id;

  IF v_color_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không tồn tại.';
  END IF;

  SELECT base_id INTO v_color_base_id
  FROM colorsystem
  WHERE color_id = NEW.color_id;

  IF v_variant_base_id <> v_color_base_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không tương thích với loại Base của sản phẩm.';
  END IF;

  IF v_stock_quantity < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không đủ tồn kho sơn gốc.';
  END IF;

  SELECT COUNT(*) INTO v_formula_count
  FROM colorsystem_colorants
  WHERE color_id = NEW.color_id;

  IF v_formula_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu chưa có công thức pha màu.';
  END IF;

  SELECT COUNT(*) INTO v_insufficient_colorants
  FROM colorsystem_colorants csc
  JOIN colorants c ON csc.colorant_id = c.colorant_id
  WHERE csc.color_id = NEW.color_id
    AND c.stock_ml < (csc.amount_ml * NEW.quantity);

  IF v_insufficient_colorants > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không đủ tồn kho tinh màu để pha.';
  END IF;

  IF NEW.price_at_sale IS NULL OR NEW.price_at_sale <= 0 THEN
    SET NEW.price_at_sale = v_unit_price;
  END IF;

  IF v_payment_method = 'debt' THEN
    SELECT credit_limit, current_debt INTO v_credit_limit, v_current_debt
    FROM customers
    WHERE customer_id = v_customer_id;

    SET v_line_total = NEW.quantity * NEW.price_at_sale;

    IF v_credit_limit <= 0 OR v_current_debt + v_line_total > v_credit_limit THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hàng vượt hạn mức công nợ của khách hàng.';
    END IF;
  END IF;
END//

CREATE TRIGGER `trg_orderdetails_after_insert`
AFTER INSERT ON `orderdetails`
FOR EACH ROW
BEGIN
  DECLARE v_payment_method varchar(20) DEFAULT 'cash';
  DECLARE v_order_status varchar(100) DEFAULT 'completed';

  SELECT payment_method, status INTO v_payment_method, v_order_status
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_status <> 'cancelled' THEN
    UPDATE productvariants
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE variant_id = NEW.variant_id;

    INSERT INTO inventory_logs (order_id, variant_id, movement_type, quantity_change, note)
    VALUES (NEW.order_id, NEW.variant_id, 'ORDER_PRODUCT_OUT', -NEW.quantity, 'Xuất sơn gốc theo đơn hàng');

    UPDATE colorants c
    JOIN colorsystem_colorants csc ON c.colorant_id = csc.colorant_id
    SET c.stock_ml = c.stock_ml - (csc.amount_ml * NEW.quantity)
    WHERE csc.color_id = NEW.color_id;

    INSERT INTO inventory_logs (order_id, colorant_id, movement_type, ml_change, note)
    SELECT NEW.order_id, csc.colorant_id, 'ORDER_COLORANT_OUT', -(csc.amount_ml * NEW.quantity), 'Chiết tinh màu theo công thức'
    FROM colorsystem_colorants csc
    WHERE csc.color_id = NEW.color_id;

    UPDATE orders
    SET total_amount = total_amount + (NEW.quantity * NEW.price_at_sale)
    WHERE order_id = NEW.order_id;

    UPDATE customers c
    JOIN orders o ON c.customer_id = o.customer_id
    SET c.current_debt = c.current_debt + (NEW.quantity * NEW.price_at_sale)
    WHERE o.order_id = NEW.order_id
      AND o.payment_method = 'debt'
      AND o.status <> 'cancelled';
  END IF;
END//

CREATE TRIGGER `trg_orderdetails_before_update`
BEFORE UPDATE ON `orderdetails`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không cập nhật trực tiếp dòng đơn hàng; hãy xóa và tạo lại để trigger hoàn tồn kho chính xác.';
END//

CREATE TRIGGER `trg_orderdetails_after_delete`
AFTER DELETE ON `orderdetails`
FOR EACH ROW
BEGIN
  DECLARE v_payment_method varchar(20) DEFAULT 'cash';
  DECLARE v_order_status varchar(100) DEFAULT 'completed';

  SELECT payment_method, status INTO v_payment_method, v_order_status
  FROM orders
  WHERE order_id = OLD.order_id;

  IF v_order_status <> 'cancelled' THEN
    UPDATE productvariants
    SET stock_quantity = stock_quantity + OLD.quantity
    WHERE variant_id = OLD.variant_id;

    INSERT INTO inventory_logs (order_id, variant_id, movement_type, quantity_change, note)
    VALUES (OLD.order_id, OLD.variant_id, 'ORDER_PRODUCT_RESTORE', OLD.quantity, 'Hoàn sơn gốc khi xóa dòng đơn hàng');

    UPDATE colorants c
    JOIN colorsystem_colorants csc ON c.colorant_id = csc.colorant_id
    SET c.stock_ml = c.stock_ml + (csc.amount_ml * OLD.quantity)
    WHERE csc.color_id = OLD.color_id;

    INSERT INTO inventory_logs (order_id, colorant_id, movement_type, ml_change, note)
    SELECT OLD.order_id, csc.colorant_id, 'ORDER_COLORANT_RESTORE', (csc.amount_ml * OLD.quantity), 'Hoàn tinh màu khi xóa dòng đơn hàng'
    FROM colorsystem_colorants csc
    WHERE csc.color_id = OLD.color_id;

    UPDATE orders
    SET total_amount = GREATEST(total_amount - (OLD.quantity * OLD.price_at_sale), 0)
    WHERE order_id = OLD.order_id;

    UPDATE customers c
    JOIN orders o ON c.customer_id = o.customer_id
    SET c.current_debt = GREATEST(c.current_debt - (OLD.quantity * OLD.price_at_sale), 0)
    WHERE o.order_id = OLD.order_id
      AND o.payment_method = 'debt'
      AND o.status <> 'cancelled';
  END IF;
END//

CREATE TRIGGER `trg_debt_payments_before_insert`
BEFORE INSERT ON `debt_payments`
FOR EACH ROW
BEGIN
  DECLARE v_current_debt decimal(14,2) DEFAULT 0;
  DECLARE v_order_customer_id int DEFAULT NULL;
  DECLARE v_payment_method varchar(20) DEFAULT NULL;
  DECLARE v_order_status varchar(100) DEFAULT NULL;
  DECLARE v_order_total decimal(14,2) DEFAULT 0;
  DECLARE v_paid_for_order decimal(14,2) DEFAULT 0;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền thanh toán công nợ phải lớn hơn 0.';
  END IF;

  SELECT current_debt INTO v_current_debt
  FROM customers
  WHERE customer_id = NEW.customer_id;

  IF NEW.amount > v_current_debt THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền thanh toán lớn hơn công nợ hiện tại.';
  END IF;

  IF NEW.order_id IS NOT NULL THEN
    SELECT customer_id, payment_method, status, total_amount
    INTO v_order_customer_id, v_payment_method, v_order_status, v_order_total
    FROM orders
    WHERE order_id = NEW.order_id;

    IF v_order_customer_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn công nợ không tồn tại.';
    END IF;

    IF v_order_customer_id <> NEW.customer_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hàng không thuộc khách hàng đang thanh toán.';
    END IF;

    IF v_payment_method <> 'debt' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được ghi nhận thanh toán cho đơn công nợ.';
    END IF;

    IF v_order_status = 'cancelled' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thanh toán cho đơn đã hủy.';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_paid_for_order
    FROM debt_payments
    WHERE order_id = NEW.order_id;

    IF v_paid_for_order + NEW.amount > v_order_total THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số tiền thanh toán vượt số tiền còn lại của đơn.';
    END IF;
  END IF;
END//

CREATE TRIGGER `trg_debt_payments_after_insert`
AFTER INSERT ON `debt_payments`
FOR EACH ROW
BEGIN
  DECLARE v_paid_for_order decimal(14,2) DEFAULT 0;
  DECLARE v_order_total decimal(14,2) DEFAULT 0;

  UPDATE customers
  SET current_debt = GREATEST(current_debt - NEW.amount, 0)
  WHERE customer_id = NEW.customer_id;

  IF NEW.order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_for_order
    FROM debt_payments
    WHERE order_id = NEW.order_id;

    SELECT total_amount INTO v_order_total
    FROM orders
    WHERE order_id = NEW.order_id;

    UPDATE orders
    SET payment_status = CASE
      WHEN v_paid_for_order >= v_order_total THEN 'paid'
      WHEN v_paid_for_order > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE order_id = NEW.order_id;
  END IF;
END//

CREATE TRIGGER `trg_debt_payments_before_update`
BEFORE UPDATE ON `debt_payments`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không sửa trực tiếp phiếu thu công nợ; hãy tạo phiếu điều chỉnh mới.';
END//

CREATE TRIGGER `trg_debt_payments_before_delete`
BEFORE DELETE ON `debt_payments`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không xóa phiếu thu công nợ để bảo toàn lịch sử kế toán.';
END//

DELIMITER ;

CREATE OR REPLACE VIEW `v_product_inventory` AS
SELECT
  pv.variant_id,
  pv.base_id,
  pv.sku_code,
  b.brand_id,
  b.name AS brand_name,
  pl.line_id,
  pl.name AS line_name,
  pl.is_interior,
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
JOIN brands b ON pl.brand_id = b.brand_id;

CREATE OR REPLACE VIEW `v_order_summary` AS
SELECT
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
GROUP BY o.order_id, o.order_date, o.total_amount, o.payment_method, o.payment_status, o.debt_due_date, o.status, c.customer_id, c.name, sales.full_name, tech.full_name, s.shift_name;

CREATE OR REPLACE VIEW `v_customer_debt_summary` AS
SELECT
  c.customer_id,
  c.name,
  c.phone,
  c.email,
  c.address,
  c.credit_limit,
  c.current_debt,
  GREATEST(c.credit_limit - c.current_debt, 0) AS remaining_credit,
  MIN(CASE WHEN o.payment_method = 'debt' AND o.status <> 'cancelled' AND o.payment_status <> 'paid' THEN o.debt_due_date END) AS next_due_date,
  COALESCE(SUM(CASE
    WHEN o.payment_method = 'debt' AND o.status <> 'cancelled' AND o.payment_status <> 'paid' AND o.debt_due_date < CURRENT_DATE
    THEN GREATEST(o.total_amount - COALESCE(p.paid_amount, 0), 0)
    ELSE 0
  END), 0) AS overdue_amount,
  CASE
    WHEN c.current_debt = 0 THEN 'Không nợ'
    WHEN c.credit_limit > 0 AND c.current_debt > c.credit_limit THEN 'Vượt hạn mức'
    WHEN COALESCE(SUM(CASE WHEN o.payment_method = 'debt' AND o.status <> 'cancelled' AND o.payment_status <> 'paid' AND o.debt_due_date < CURRENT_DATE THEN 1 ELSE 0 END), 0) > 0 THEN 'Quá hạn'
    WHEN c.credit_limit > 0 AND c.current_debt >= c.credit_limit * 0.8 THEN 'Sắp vượt hạn mức'
    ELSE 'Đang nợ'
  END AS debt_status
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN (
  SELECT order_id, SUM(amount) AS paid_amount
  FROM debt_payments
  WHERE order_id IS NOT NULL
  GROUP BY order_id
) p ON o.order_id = p.order_id
GROUP BY c.customer_id, c.name, c.phone, c.email, c.address, c.credit_limit, c.current_debt;

CREATE OR REPLACE VIEW `v_overdue_debts` AS
SELECT
  o.order_id,
  o.customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  c.email AS customer_email,
  o.order_date,
  o.total_amount,
  o.debt_due_date,
  o.payment_status,
  COALESCE(p.paid_amount, 0) AS paid_amount,
  GREATEST(o.total_amount - COALESCE(p.paid_amount, 0), 0) AS outstanding_amount,
  DATEDIFF(CURRENT_DATE, o.debt_due_date) AS days_overdue
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN (
  SELECT order_id, SUM(amount) AS paid_amount
  FROM debt_payments
  WHERE order_id IS NOT NULL
  GROUP BY order_id
) p ON o.order_id = p.order_id
WHERE o.payment_method = 'debt'
  AND o.status <> 'cancelled'
  AND o.payment_status <> 'paid'
  AND o.debt_due_date < CURRENT_DATE;

-- Du lieu mau phuc vu demo truy van, ton kho kep, cong thuc mau, trigger, transaction va cong no co han tra.
INSERT INTO `jobs` (`job_title`, `min_salary`, `max_salary`) VALUES
('Quản lý cửa hàng', 12000000, 20000000),
('Nhân viên bán hàng', 7000000, 12000000),
('Kỹ thuật viên pha màu', 8000000, 14000000);

INSERT INTO `shifts` (`shift_name`, `start_time`, `end_time`) VALUES
('Ca sáng', '08:00:00', '12:00:00'),
('Ca chiều', '13:00:00', '17:00:00'),
('Ca tối', '18:00:00', '22:00:00');

INSERT INTO `employees` (`full_name`, `email`, `phone`, `hire_date`, `password_hash`, `job_id`, `role`) VALUES
('Nguyễn Phú Lâm', 'lam.sales@khanhpaint.local', '0911000001', '2026-05-01', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 2, 'admin'),
('Trần Gia Huy', 'huy.tech@khanhpaint.local', '0911000002', '2026-05-03', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 3, 'staff');

INSERT INTO `employees_shifts` (`employee_id`, `shift_id`, `working_date`) VALUES
(1, 1, '2026-06-01'),
(2, 1, '2026-06-01'),
(1, 2, '2026-06-05'),
(2, 2, '2026-06-05'),
(1, 1, '2026-06-10'),
(2, 1, '2026-06-10');

INSERT INTO `brands` (`name`, `origin`, `description`) VALUES
('Dulux', 'Netherlands', 'Thương hiệu sơn trang trí phổ biến cho nội thất và ngoại thất.'),
('Jotun', 'Norway', 'Sơn trang trí và sơn bảo vệ có độ bền cao.'),
('Kova', 'Vietnam', 'Thương hiệu sơn Việt Nam phù hợp khí hậu nhiệt đới.');

INSERT INTO `productlines` (`brand_id`, `name`, `is_interior`, `description`) VALUES
(1, 'Inspire Interior', 1, 'Dòng sơn nội thất dễ thi công.'),
(1, 'Weathershield Exterior', 0, 'Dòng sơn ngoại thất bền thời tiết.'),
(2, 'Majestic', 1, 'Dòng sơn nội thất cao cấp.'),
(3, 'Kova Nano', 1, 'Dòng sơn nội thất kháng khuẩn.');

INSERT INTO `basetypes` (`line_id`, `base_name`, `coverage_rate`, `drying_time`, `gloss_level`, `recommended_layers`) VALUES
(1, 'Base A', 12.00, '2 giờ', 'Mờ', '2 lớp'),
(1, 'Base C', 10.00, '2 giờ', 'Mờ', '2 lớp'),
(2, 'Base Exterior A', 9.50, '3 giờ', 'Bóng nhẹ', '2 lớp'),
(3, 'Base Premium A', 13.00, '2 giờ', 'Bán bóng', '2 lớp'),
(4, 'Base Nano A', 11.00, '2 giờ', 'Mờ', '2 lớp');

INSERT INTO `productvariants` (`base_id`, `volume`, `sku_code`, `unit_price`, `stock_quantity`, `warehouse_location`) VALUES
(1, '1L', 'DUL-IN-A-1L', 165000, 18, 'Kệ A1'),
(1, '5L', 'DUL-IN-A-5L', 720000, 8, 'Kệ A2'),
(2, '5L', 'DUL-IN-C-5L', 760000, 4, 'Kệ A3'),
(3, '18L', 'DUL-EXT-A-18L', 2450000, 7, 'Kệ B1'),
(4, '5L', 'JOT-MAJ-A-5L', 890000, 6, 'Kệ C1'),
(5, '5L', 'KOV-NANO-A-5L', 680000, 3, 'Kệ D1');

INSERT INTO `colorants` (`colorant_name`, `stock_ml`, `unit_price_per_ml`) VALUES
('Red Oxide', 5200, 120),
('Yellow Oxide', 420, 110),
('Black', 6100, 95),
('Blue', 3600, 135),
('Green', 280, 125),
('White Tint', 9000, 80);

INSERT INTO `colorsystem` (`color_code`, `color_name`, `base_id`) VALUES
('KP-001', 'Trắng kem', 1),
('KP-002', 'Xanh pastel', 1),
('KP-003', 'Vàng nắng', 2),
('KP-004', 'Xám ghi', 4),
('KP-005', 'Xanh rêu nhạt', 5),
('KP-006', 'Xanh ngoại thất', 3);

INSERT INTO `colorsystem_colorants` (`color_id`, `colorant_id`, `amount_ml`) VALUES
(1, 1, 6.50),
(1, 2, 8.00),
(1, 6, 14.00),
(2, 4, 15.00),
(2, 3, 2.50),
(2, 6, 10.00),
(3, 2, 24.00),
(3, 1, 4.00),
(4, 3, 18.50),
(4, 6, 7.00),
(5, 5, 17.00),
(5, 2, 6.00),
(5, 3, 2.00),
(6, 4, 20.00),
(6, 6, 5.00);

INSERT INTO `customers` (`name`, `phone`, `email`, `password_hash`, `address`, `credit_limit`, `current_debt`) VALUES
('Nguyễn Văn An', '0901000001', 'an.nguyen@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Hà Nội', 5000000, 0),
('Trần Thị Bình', '0901000002', 'binh.tran@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Bắc Ninh', 3000000, 0),
('Lê Minh Cường', '0901000003', 'cuong.le@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Hải Phòng', 5000000, 0);

INSERT INTO `orders` (`customer_id`, `sales_rep_id`, `tech_id`, `shift_id`, `order_date`, `total_amount`, `payment_method`, `payment_status`, `debt_due_date`, `status`) VALUES
(1, 1, 2, 1, '2026-06-01 09:30:00', 0, 'debt', 'unpaid', '2026-06-16', 'completed'),
(2, 1, 2, 2, '2026-06-05 15:10:00', 0, 'cash', 'paid', NULL, 'completed'),
(3, 1, 2, 1, '2026-06-10 10:45:00', 0, 'debt', 'unpaid', '2026-06-25', 'pending');

INSERT INTO `orderdetails` (`order_id`, `variant_id`, `color_id`, `quantity`, `price_at_sale`) VALUES
(1, 2, 1, 1, 720000),
(1, 3, 3, 1, 765000),
(2, 5, 4, 1, 890000),
(3, 4, 6, 1, 2450000),
(3, 6, 5, 1, 680000);

INSERT INTO `debt_payments` (`customer_id`, `order_id`, `employee_id`, `amount`, `payment_method`, `payment_date`, `note`) VALUES
(1, 1, 1, 500000, 'cash', '2026-06-12 10:00:00', 'Khách thanh toán một phần công nợ đơn #1');
