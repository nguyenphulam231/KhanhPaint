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

-- Du lieu mau mo rong phuc vu demo san pham thuc te, ton kho kep, cong thuc mau, nhan su, ca lam va cong no co han tra.
-- Luu y: Ten san pham va cong thuc mau duoi day la du lieu mo phong cho bai tap, khong phai cong thuc chinh thuc cua cac hang son.
INSERT INTO `jobs` (`job_id`, `job_title`, `min_salary`, `max_salary`) VALUES
(1, 'Quản lý cửa hàng', 12000000, 20000000),
(2, 'Nhân viên bán hàng', 7000000, 12000000),
(3, 'Kỹ thuật viên pha màu', 8000000, 14000000),
(4, 'Kế toán công nợ', 7500000, 13000000),
(5, 'Thủ kho', 7000000, 11000000);

INSERT INTO `shifts` (`shift_id`, `shift_name`, `start_time`, `end_time`) VALUES
(1, 'Ca sáng', '08:00:00', '12:00:00'),
(2, 'Ca chiều', '13:00:00', '17:00:00'),
(3, 'Ca tối', '18:00:00', '22:00:00');

INSERT INTO `employees` (`employee_id`, `full_name`, `email`, `phone`, `hire_date`, `password_hash`, `job_id`, `role`) VALUES
(1, 'Nguyễn Phú Lâm', 'lam.manager@khanhpaint.local', '0911000001', '2026-04-20', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 1, 'admin'),
(2, 'Trần Gia Huy', 'huy.sales@khanhpaint.local', '0911000002', '2026-05-01', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 2, 'staff'),
(3, 'Nguyễn Trần Gia Huy', 'giahuy.sales@khanhpaint.local', '0911000003', '2026-05-02', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 2, 'staff'),
(4, 'Đỗ Minh Quân', 'quan.tech@khanhpaint.local', '0911000004', '2026-05-03', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 3, 'staff'),
(5, 'Vũ Hải Yến', 'yen.tech@khanhpaint.local', '0911000005', '2026-05-05', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 3, 'staff'),
(6, 'Phạm Thanh Mai', 'mai.accounting@khanhpaint.local', '0911000006', '2026-05-08', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 4, 'staff'),
(7, 'Lê Quốc Bảo', 'bao.warehouse@khanhpaint.local', '0911000007', '2026-05-10', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 5, 'staff');

INSERT INTO `employees_shifts` (`employee_id`, `shift_id`, `working_date`) VALUES
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 0 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
(1, 1, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(2, 1, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(4, 1, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(7, 1, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(3, 2, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(5, 2, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(2, 3, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY)),
(5, 3, DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY));

INSERT INTO `brands` (`brand_id`, `name`, `origin`, `description`) VALUES
(1, 'Dulux', 'Netherlands', 'Thương hiệu sơn trang trí phổ biến, mạnh về nội thất và ngoại thất cao cấp.'),
(2, 'Jotun', 'Norway', 'Thương hiệu sơn bảo vệ và trang trí có độ bền màu cao.'),
(3, 'Nippon Paint', 'Japan', 'Thương hiệu sơn đa phân khúc, phổ biến trong nhà dân dụng.'),
(4, 'Kova', 'Vietnam', 'Thương hiệu sơn Việt Nam, nổi bật về chống thấm và kháng khuẩn.'),
(5, 'Maxilite', 'Netherlands', 'Dòng sơn phổ thông, dễ thi công, giá phù hợp công trình lớn.'),
(6, 'Mykolor', 'Vietnam', 'Thương hiệu sơn trang trí có bảng màu phong phú, hướng tới thẩm mỹ cao.');

INSERT INTO `productlines` (`line_id`, `brand_id`, `name`, `is_interior`, `description`) VALUES
(1, 1, 'Inspire Interior', 1, 'Sơn nội thất dễ thi công, phù hợp nhà ở và căn hộ.'),
(2, 1, 'Weathershield Exterior', 0, 'Sơn ngoại thất chống chịu thời tiết, bám dính tốt.'),
(3, 1, 'Aquatech Chống thấm', 0, 'Dòng sơn chống thấm cho tường ngoài và khu vực ẩm.'),
(4, 2, 'Majestic Đẹp Hoàn Hảo', 1, 'Sơn nội thất cao cấp, bề mặt mịn và bền màu.'),
(5, 2, 'Jotashield Exterior', 0, 'Sơn ngoại thất cao cấp, chống phai màu.'),
(6, 2, 'Essence Easy Clean', 1, 'Sơn nội thất dễ lau chùi cho gia đình.'),
(7, 3, 'Odour-less Chùi Rửa', 1, 'Sơn nội thất ít mùi, lau chùi tốt.'),
(8, 3, 'WeatherGard', 0, 'Sơn ngoại thất chống rêu mốc và tia UV.'),
(9, 3, 'Matex Sealer Sơn lót', 1, 'Sơn lót nội thất giúp tăng độ bám dính lớp phủ.'),
(10, 4, 'Nano Clean', 1, 'Sơn nội thất kháng khuẩn, chống bám bẩn.'),
(11, 4, 'CT-11A Plus Chống thấm', 0, 'Chống thấm xi măng polymer cho tường và sàn.'),
(12, 4, 'Kova Exterior Bóng', 0, 'Sơn ngoại thất bóng nhẹ, phù hợp khí hậu nóng ẩm.'),
(13, 5, 'Maxilite Plus Interior', 1, 'Sơn nội thất phổ thông cho công trình dân dụng.'),
(14, 5, 'Maxilite Exterior', 0, 'Sơn ngoại thất phổ thông, kinh tế.'),
(15, 6, 'Grand Interior', 1, 'Sơn nội thất trang trí với màu sắc đa dạng.'),
(16, 6, 'Touch Exterior', 0, 'Sơn ngoại thất trang trí, bền màu và chống bám bẩn.');

INSERT INTO `basetypes` (`base_id`, `line_id`, `base_name`, `coverage_rate`, `drying_time`, `gloss_level`, `recommended_layers`) VALUES
(1, 1, 'Base A', 12.00, '2 giờ', 'Mờ', '2 lớp'),
(2, 1, 'Base B', 11.00, '2 giờ', 'Mờ', '2 lớp'),
(3, 1, 'Base C', 10.00, '2 giờ', 'Mờ', '2 lớp'),
(4, 2, 'Base Exterior A', 9.50, '3 giờ', 'Bóng nhẹ', '2 lớp'),
(5, 2, 'Base Exterior C', 8.80, '3 giờ', 'Bóng nhẹ', '2 lớp'),
(6, 3, 'White Base chống thấm', 7.50, '4 giờ', 'Mờ', '2 lớp'),
(7, 4, 'Base Premium A', 13.00, '2 giờ', 'Bán bóng', '2 lớp'),
(8, 4, 'Base Premium C', 11.50, '2 giờ', 'Bán bóng', '2 lớp'),
(9, 5, 'Base Shield A', 9.00, '3 giờ', 'Bóng nhẹ', '2 lớp'),
(10, 5, 'Base Shield C', 8.50, '3 giờ', 'Bóng nhẹ', '2 lớp'),
(11, 6, 'Base Easy Clean A', 12.00, '2 giờ', 'Mờ', '2 lớp'),
(12, 7, 'Base Odour-less A', 12.50, '2 giờ', 'Mờ', '2 lớp'),
(13, 7, 'Base Odour-less C', 10.50, '2 giờ', 'Mờ', '2 lớp'),
(14, 8, 'Base Weather A', 9.00, '3 giờ', 'Bán bóng', '2 lớp'),
(15, 9, 'White Base sơn lót', 10.00, '1 giờ', 'Mờ', '1 lớp'),
(16, 10, 'Base Nano A', 11.00, '2 giờ', 'Mờ', '2 lớp'),
(17, 10, 'Base Nano C', 9.50, '2 giờ', 'Mờ', '2 lớp'),
(18, 11, 'Clear Base chống thấm', 6.50, '4 giờ', 'Trong mờ', '2 lớp'),
(19, 12, 'Base Kova Exterior A', 9.00, '3 giờ', 'Bóng', '2 lớp'),
(20, 13, 'Base Plus A', 11.00, '2 giờ', 'Mờ', '2 lớp'),
(21, 14, 'Base Maxilite Exterior A', 8.50, '3 giờ', 'Mờ', '2 lớp'),
(22, 15, 'Base Grand A', 12.00, '2 giờ', 'Bán bóng', '2 lớp'),
(23, 15, 'Base Grand C', 10.00, '2 giờ', 'Bán bóng', '2 lớp'),
(24, 16, 'Base Touch Exterior A', 9.00, '3 giờ', 'Bóng nhẹ', '2 lớp');

INSERT INTO `productvariants` (`variant_id`, `base_id`, `volume`, `sku_code`, `unit_price`, `stock_quantity`, `warehouse_location`) VALUES
(1, 1, '1L', 'DUL-IN-A-1L', 187000, 13, 'Kệ A1'),
(2, 1, '5L', 'DUL-IN-A-5L', 720000, 8, 'Kệ A2'),
(3, 1, '18L', 'DUL-IN-A-18L', 2412000, 4, 'Kệ A3'),
(4, 2, '1L', 'DUL-IN-B-1L', 191000, 14, 'Kệ B1'),
(5, 2, '5L', 'DUL-IN-B-5L', 735000, 9, 'Kệ B2'),
(6, 2, '18L', 'DUL-IN-B-18L', 2462000, 5, 'Kệ B3'),
(7, 3, '1L', 'DUL-IN-C-1L', 198000, 15, 'Kệ C1'),
(8, 3, '5L', 'DUL-IN-C-5L', 760000, 4, 'Kệ C2'),
(9, 3, '18L', 'DUL-IN-C-18L', 2546000, 6, 'Kệ C3'),
(10, 4, '1L', 'DUL-WEA-A-1L', 199000, 16, 'Kệ D1'),
(11, 4, '5L', 'DUL-WEA-A-5L', 766000, 11, 'Kệ D2'),
(12, 4, '18L', 'DUL-WEA-A-18L', 2566000, 7, 'Kệ D3'),
(13, 5, '1L', 'DUL-WEA-C-1L', 205000, 17, 'Kệ E1'),
(14, 5, '5L', 'DUL-WEA-C-5L', 790000, 12, 'Kệ E2'),
(15, 5, '18L', 'DUL-WEA-C-18L', 2646000, 3, 'Kệ E3'),
(16, 6, '1L', 'DUL-AQT-W-1L', 229000, 12, 'Kệ F1'),
(17, 6, '5L', 'DUL-AQT-W-5L', 880000, 13, 'Kệ F2'),
(18, 6, '18L', 'DUL-AQT-W-18L', 2948000, 2, 'Kệ F3'),
(19, 7, '1L', 'JOT-MAJ-A-1L', 231000, 13, 'Kệ A1'),
(20, 7, '5L', 'JOT-MAJ-A-5L', 890000, 14, 'Kệ A2'),
(21, 7, '18L', 'JOT-MAJ-A-18L', 2982000, 5, 'Kệ A3'),
(22, 8, '1L', 'JOT-MAJ-C-1L', 242000, 14, 'Kệ B1'),
(23, 8, '5L', 'JOT-MAJ-C-5L', 930000, 7, 'Kệ B2'),
(24, 8, '18L', 'JOT-MAJ-C-18L', 3116000, 6, 'Kệ B3'),
(25, 9, '1L', 'JOT-SHI-A-1L', 255000, 15, 'Kệ C1'),
(26, 9, '5L', 'JOT-SHI-A-5L', 980000, 8, 'Kệ C2'),
(27, 9, '18L', 'JOT-SHI-A-18L', 3283000, 7, 'Kệ C3'),
(28, 10, '1L', 'JOT-SHI-C-1L', 265000, 16, 'Kệ D1'),
(29, 10, '5L', 'JOT-SHI-C-5L', 1020000, 9, 'Kệ D2'),
(30, 10, '18L', 'JOT-SHI-C-18L', 3417000, 3, 'Kệ D3'),
(31, 11, '1L', 'JOT-ESS-A-1L', 169000, 17, 'Kệ E1'),
(32, 11, '5L', 'JOT-ESS-A-5L', 650000, 10, 'Kệ E2'),
(33, 11, '18L', 'JOT-ESS-A-18L', 2178000, 4, 'Kệ E3'),
(34, 12, '1L', 'NIP-ODL-A-1L', 198000, 12, 'Kệ F1'),
(35, 12, '5L', 'NIP-ODL-A-5L', 760000, 11, 'Kệ F2'),
(36, 12, '18L', 'NIP-ODL-A-18L', 2546000, 5, 'Kệ F3'),
(37, 13, '1L', 'NIP-ODL-C-1L', 207000, 13, 'Kệ A1'),
(38, 13, '5L', 'NIP-ODL-C-5L', 795000, 12, 'Kệ A2'),
(39, 13, '18L', 'NIP-ODL-C-18L', 2663000, 6, 'Kệ A3'),
(40, 14, '1L', 'NIP-WEA-A-1L', 291000, 14, 'Kệ B1'),
(41, 14, '5L', 'NIP-WEA-A-5L', 1120000, 13, 'Kệ B2'),
(42, 14, '18L', 'NIP-WEA-A-18L', 3752000, 7, 'Kệ B3'),
(43, 15, '1L', 'NIP-MTX-W-1L', 135000, 15, 'Kệ C1'),
(44, 15, '5L', 'NIP-MTX-W-5L', 520000, 14, 'Kệ C2'),
(45, 15, '18L', 'NIP-MTX-W-18L', 1742000, 2, 'Kệ C3'),
(46, 16, '1L', 'KOV-NAN-A-1L', 177000, 16, 'Kệ D1'),
(47, 16, '5L', 'KOV-NAN-A-5L', 680000, 7, 'Kệ D2'),
(48, 16, '18L', 'KOV-NAN-A-18L', 2278000, 4, 'Kệ D3'),
(49, 17, '1L', 'KOV-NAN-C-1L', 185000, 17, 'Kệ E1'),
(50, 17, '5L', 'KOV-NAN-C-5L', 710000, 4, 'Kệ E2'),
(51, 17, '18L', 'KOV-NAN-C-18L', 2378000, 5, 'Kệ E3'),
(52, 18, '1L', 'KOV-CT11-CL-1L', 244000, 12, 'Kệ F1'),
(53, 18, '5L', 'KOV-CT11-CL-5L', 940000, 9, 'Kệ F2'),
(54, 18, '18L', 'KOV-CT11-CL-18L', 3149000, 6, 'Kệ F3'),
(55, 19, '1L', 'KOV-EXT-A-1L', 224000, 13, 'Kệ A1'),
(56, 19, '5L', 'KOV-EXT-A-5L', 860000, 10, 'Kệ A2'),
(57, 19, '18L', 'KOV-EXT-A-18L', 2881000, 7, 'Kệ A3'),
(58, 20, '1L', 'MAX-INT-A-1L', 117000, 14, 'Kệ B1'),
(59, 20, '5L', 'MAX-INT-A-5L', 450000, 11, 'Kệ B2'),
(60, 20, '18L', 'MAX-INT-A-18L', 1508000, 3, 'Kệ B3'),
(61, 21, '1L', 'MAX-EXT-A-1L', 161000, 15, 'Kệ C1'),
(62, 21, '5L', 'MAX-EXT-A-5L', 620000, 12, 'Kệ C2'),
(63, 21, '18L', 'MAX-EXT-A-18L', 2077000, 2, 'Kệ C3'),
(64, 22, '1L', 'MYK-GRD-A-1L', 257000, 16, 'Kệ D1'),
(65, 22, '5L', 'MYK-GRD-A-5L', 990000, 13, 'Kệ D2'),
(66, 22, '18L', 'MYK-GRD-A-18L', 3316000, 5, 'Kệ D3'),
(67, 23, '1L', 'MYK-GRD-C-1L', 270000, 17, 'Kệ E1'),
(68, 23, '5L', 'MYK-GRD-C-5L', 1040000, 4, 'Kệ E2'),
(69, 23, '18L', 'MYK-GRD-C-18L', 3484000, 6, 'Kệ E3'),
(70, 24, '1L', 'MYK-TCH-A-1L', 307000, 12, 'Kệ F1'),
(71, 24, '5L', 'MYK-TCH-A-5L', 1180000, 7, 'Kệ F2'),
(72, 24, '18L', 'MYK-TCH-A-18L', 3953000, 7, 'Kệ F3');

INSERT INTO `colorants` (`colorant_id`, `colorant_name`, `stock_ml`, `unit_price_per_ml`) VALUES
(1, 'Titanium White Tint', 150000.00, 80.00),
(2, 'Lamp Black', 45000.00, 95.00),
(3, 'Yellow Oxide', 52000.00, 110.00),
(4, 'Red Oxide', 48000.00, 120.00),
(5, 'Phthalo Blue', 39000.00, 135.00),
(6, 'Phthalo Green', 32000.00, 125.00),
(7, 'Organic Red', 25000.00, 145.00),
(8, 'Lemon Yellow', 30000.00, 118.00),
(9, 'Violet', 18000.00, 150.00),
(10, 'Orange', 22000.00, 130.00),
(11, 'Brown Oxide', 28000.00, 105.00),
(12, 'Magenta', 16000.00, 155.00),
(13, 'Deep Blue', 21000.00, 140.00),
(14, 'Clear Additive', 60000.00, 70.00);

INSERT INTO `colorsystem` (`color_id`, `color_code`, `color_name`, `base_id`) VALUES
(1, 'KP-01A', 'Trắng sứ', 1),
(2, 'KP-01B', 'Kem sữa', 1),
(3, 'KP-02A', 'Be cát', 2),
(4, 'KP-02B', 'Cam đào nhạt', 2),
(5, 'KP-03A', 'Vàng nắng', 3),
(6, 'KP-03B', 'Nâu cafe', 3),
(7, 'KP-04A', 'Xám ghi', 4),
(8, 'KP-04B', 'Xám khói', 4),
(9, 'KP-05A', 'Xanh mint', 5),
(10, 'KP-05B', 'Xanh pastel', 5),
(11, 'KP-06A', 'Xanh navy', 6),
(12, 'KP-06B', 'Xanh biển', 6),
(13, 'KP-07A', 'Hồng phấn', 7),
(14, 'KP-07B', 'Tím lavender', 7),
(15, 'KP-08A', 'Đỏ gạch', 8),
(16, 'KP-08B', 'Nâu đất', 8),
(17, 'KP-09A', 'Trắng sứ', 9),
(18, 'KP-09B', 'Kem sữa', 9),
(19, 'KP-10A', 'Be cát', 10),
(20, 'KP-10B', 'Cam đào nhạt', 10),
(21, 'KP-11A', 'Vàng nắng', 11),
(22, 'KP-11B', 'Nâu cafe', 11),
(23, 'KP-12A', 'Xám ghi', 12),
(24, 'KP-12B', 'Xám khói', 12),
(25, 'KP-13A', 'Xanh mint', 13),
(26, 'KP-13B', 'Xanh pastel', 13),
(27, 'KP-14A', 'Xanh navy', 14),
(28, 'KP-14B', 'Xanh biển', 14),
(29, 'KP-15A', 'Hồng phấn', 15),
(30, 'KP-15B', 'Tím lavender', 15),
(31, 'KP-16A', 'Đỏ gạch', 16),
(32, 'KP-16B', 'Nâu đất', 16),
(33, 'KP-17A', 'Trắng sứ', 17),
(34, 'KP-17B', 'Kem sữa', 17),
(35, 'KP-18A', 'Be cát', 18),
(36, 'KP-18B', 'Cam đào nhạt', 18),
(37, 'KP-19A', 'Vàng nắng', 19),
(38, 'KP-19B', 'Nâu cafe', 19),
(39, 'KP-20A', 'Xám ghi', 20),
(40, 'KP-20B', 'Xám khói', 20),
(41, 'KP-21A', 'Xanh mint', 21),
(42, 'KP-21B', 'Xanh pastel', 21),
(43, 'KP-22A', 'Xanh navy', 22),
(44, 'KP-22B', 'Xanh biển', 22),
(45, 'KP-23A', 'Hồng phấn', 23),
(46, 'KP-23B', 'Tím lavender', 23),
(47, 'KP-24A', 'Đỏ gạch', 24),
(48, 'KP-24B', 'Nâu đất', 24);

INSERT INTO `colorsystem_colorants` (`color_id`, `colorant_id`, `amount_ml`) VALUES
(1, 1, 13.00),
(1, 3, 3.00),
(2, 1, 10.50),
(2, 3, 5.50),
(2, 4, 2.50),
(3, 3, 12.00),
(3, 11, 7.00),
(3, 1, 8.00),
(4, 10, 8.00),
(4, 7, 2.00),
(4, 1, 8.00),
(5, 3, 18.00),
(5, 8, 6.00),
(5, 1, 5.00),
(6, 11, 14.50),
(6, 4, 5.50),
(6, 2, 2.50),
(7, 2, 17.00),
(7, 1, 9.00),
(8, 2, 20.00),
(8, 5, 2.00),
(8, 1, 6.00),
(9, 6, 11.00),
(9, 5, 7.00),
(9, 1, 10.00),
(10, 5, 12.50),
(10, 1, 10.50),
(10, 2, 1.50),
(11, 13, 22.00),
(11, 2, 5.00),
(11, 5, 5.00),
(12, 5, 20.00),
(12, 1, 8.00),
(13, 12, 9.00),
(13, 1, 13.00),
(13, 7, 3.00),
(14, 9, 9.50),
(14, 1, 12.50),
(14, 5, 2.50),
(15, 4, 22.00),
(15, 11, 7.00),
(15, 2, 5.00),
(16, 11, 18.00),
(16, 4, 6.00),
(16, 2, 2.00),
(17, 1, 12.00),
(17, 3, 2.00),
(18, 1, 10.50),
(18, 3, 5.50),
(18, 4, 2.50),
(19, 3, 11.00),
(19, 11, 6.00),
(19, 1, 7.00),
(20, 10, 8.00),
(20, 7, 2.00),
(20, 1, 8.00),
(21, 3, 20.00),
(21, 8, 8.00),
(21, 1, 7.00),
(22, 11, 14.50),
(22, 4, 5.50),
(22, 2, 2.50),
(23, 2, 16.00),
(23, 1, 8.00),
(24, 2, 20.00),
(24, 5, 2.00),
(24, 1, 6.00),
(25, 6, 10.00),
(25, 5, 6.00),
(25, 1, 9.00),
(26, 5, 12.50),
(26, 1, 10.50),
(26, 2, 1.50),
(27, 13, 24.00),
(27, 2, 7.00),
(27, 5, 7.00),
(28, 5, 20.00),
(28, 1, 8.00),
(29, 12, 8.00),
(29, 1, 12.00),
(29, 7, 2.00),
(30, 9, 9.50),
(30, 1, 12.50),
(30, 5, 2.50),
(31, 4, 21.00),
(31, 11, 6.00),
(31, 2, 4.00),
(32, 11, 18.00),
(32, 4, 6.00),
(32, 2, 2.00),
(33, 1, 14.00),
(33, 3, 4.00),
(34, 1, 10.50),
(34, 3, 5.50),
(34, 4, 2.50),
(35, 3, 10.00),
(35, 11, 5.00),
(35, 1, 6.00),
(36, 10, 8.00),
(36, 7, 2.00),
(36, 1, 8.00),
(37, 3, 19.00),
(37, 8, 7.00),
(37, 1, 6.00),
(38, 11, 14.50),
(38, 4, 5.50),
(38, 2, 2.50),
(39, 2, 18.00),
(39, 1, 10.00),
(40, 2, 20.00),
(40, 5, 2.00),
(40, 1, 6.00),
(41, 6, 9.00),
(41, 5, 5.00),
(41, 1, 8.00),
(42, 5, 12.50),
(42, 1, 10.50),
(42, 2, 1.50),
(43, 13, 23.00),
(43, 2, 6.00),
(43, 5, 6.00),
(44, 5, 20.00),
(44, 1, 8.00),
(45, 12, 10.00),
(45, 1, 14.00),
(45, 7, 4.00),
(46, 9, 9.50),
(46, 1, 12.50),
(46, 5, 2.50),
(47, 4, 20.00),
(47, 11, 5.00),
(47, 2, 3.00),
(48, 11, 18.00),
(48, 4, 6.00),
(48, 2, 2.00);

INSERT INTO `customers` (`customer_id`, `name`, `phone`, `email`, `password_hash`, `address`, `credit_limit`, `current_debt`) VALUES
(1, 'Nguyễn Văn An', '0901000001', 'an.nguyen@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Hà Nội', 5000000, 0),
(2, 'Trần Thị Bình', '0901000002', 'binh.tran@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Bắc Ninh', 5000000, 0),
(3, 'Lê Minh Cường', '0901000003', 'cuong.le@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Hải Phòng', 3000000, 0),
(4, 'Phạm Thu Dung', '0901000004', 'dung.pham@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Hà Nam', 5000000, 0),
(5, 'Hoàng Gia Phát', '0901000005', 'phat.hoang@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Hưng Yên', 8000000, 0),
(6, 'Công ty Minh Long', '0901000006', 'minhlong.paint@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'KCN Quế Võ, Bắc Ninh', 10000000, 0),
(7, 'Nguyễn Hữu Khang', '0901000007', 'khang.nguyen@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Nam Định', 0, 0),
(8, 'Xưởng Nội Thất An Phú', '0901000008', 'anphu.interior@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8mV9QMwb.FsLd0lQpIKqzeC857jGqK', 'Long Biên, Hà Nội', 15000000, 0);

INSERT INTO `orders` (`order_id`, `customer_id`, `sales_rep_id`, `tech_id`, `shift_id`, `order_date`, `total_amount`, `payment_method`, `payment_status`, `debt_due_date`, `status`) VALUES
(1, 1, 2, 4, 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 40 DAY), 0, 'cash', 'unpaid', NULL, 'completed'),
(2, 2, 2, 4, 2, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 DAY), 0, 'debt', 'unpaid', DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), 'completed'),
(3, 3, 3, 5, 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY), 0, 'debt', 'unpaid', DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 'completed'),
(4, 4, 2, 5, 2, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 25 DAY), 0, 'debt', 'unpaid', DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 'completed'),
(5, 5, 3, 4, 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 8 DAY), 0, 'debt', 'unpaid', DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'completed'),
(6, 6, 2, 4, 2, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 18 DAY), 0, 'debt', 'unpaid', DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 'completed'),
(7, 7, 3, 5, 3, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 6 DAY), 0, 'cash', 'unpaid', NULL, 'completed'),
(8, 8, 2, 5, 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 35 DAY), 0, 'debt', 'unpaid', DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY), 'completed'),
(9, 8, 3, 4, 2, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY), 0, 'debt', 'unpaid', DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), 'pending'),
(10, 1, 2, 4, 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 12 DAY), 0, 'cash', 'unpaid', NULL, 'completed');

INSERT INTO `orderdetails` (`order_id`, `variant_id`, `color_id`, `quantity`, `price_at_sale`) VALUES
(1, 2, 1, 1, 720000),
(1, 34, 24, 2, 198000),
(2, 11, 7, 2, 766000),
(3, 20, 13, 2, 890000),
(3, 32, 22, 1, 650000),
(4, 47, 31, 2, 680000),
(4, 58, 40, 3, 117000),
(5, 65, 43, 2, 990000),
(5, 68, 46, 1, 1040000),
(6, 27, 17, 1, 3283000),
(7, 44, 29, 1, 520000),
(7, 7, 6, 2, 198000),
(8, 42, 27, 1, 3752000),
(8, 35, 24, 1, 760000),
(9, 71, 47, 2, 1180000),
(10, 1, 2, 3, 187000);

INSERT INTO `debt_payments` (`customer_id`, `order_id`, `employee_id`, `amount`, `payment_method`, `payment_date`, `note`) VALUES
(5, 5, 6, 1200000, 'bank_transfer', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY), 'Thanh toán một phần đơn công nợ, còn lại để demo trạng thái partial'),
(6, 6, 6, 3283000, 'bank_transfer', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY), 'Khách đã tất toán đủ đơn công nợ'),
(8, 8, 6, 2000000, 'cash', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY), 'Xưởng An Phú thanh toán một phần đơn quá hạn');
