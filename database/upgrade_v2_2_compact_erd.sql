USE `khanhpaintdealerdatabase`;

-- V2.2 Compact ERD Upgrade
-- Mục tiêu: nâng lõi CSDL nhưng không làm rối ERD.
-- Thêm/chuẩn hóa BaseInventory, version công thức trên quan hệ ColorSystem-Colorants,
-- trạng thái pha/QC trên OrderDetails, stored procedures, view, index và testability.

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

DROP PROCEDURE IF EXISTS sp_rebuild_formula_primary_key_if_needed$$
CREATE PROCEDURE sp_rebuild_formula_primary_key_if_needed()
BEGIN
  DECLARE v_has_version_pk INT DEFAULT 0;

  SELECT COUNT(*) INTO v_has_version_pk
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'colorsystem_colorants'
    AND INDEX_NAME = 'PRIMARY'
    AND COLUMN_NAME = 'formula_version';

  IF v_has_version_pk = 0 THEN
    ALTER TABLE colorsystem_colorants
      DROP PRIMARY KEY,
      ADD PRIMARY KEY (color_id, formula_version, colorant_id);
  END IF;
END$$

DELIMITER ;

-- 1) BaseInventory: hiện thực tồn kho sơn gốc tách khỏi bảng danh mục ProductVariants.
CREATE TABLE IF NOT EXISTS baseinventory (
  inventory_id INT NOT NULL AUTO_INCREMENT,
  variant_id INT NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  warehouse_location VARCHAR(255) NULL,
  reorder_level INT NOT NULL DEFAULT 5,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_id),
  UNIQUE KEY uk_baseinventory_variant (variant_id),
  CONSTRAINT fk_baseinventory_variant
    FOREIGN KEY (variant_id) REFERENCES productvariants(variant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_baseinventory_stock_nonnegative CHECK (stock_quantity >= 0),
  CONSTRAINT chk_baseinventory_reorder_nonnegative CHECK (reorder_level >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO baseinventory (variant_id, stock_quantity, warehouse_location, reorder_level)
SELECT pv.variant_id, pv.stock_quantity, pv.warehouse_location, 5
FROM productvariants pv
LEFT JOIN baseinventory bi ON pv.variant_id = bi.variant_id
WHERE bi.variant_id IS NULL;

-- 2) Version hóa công thức ngay trên quan hệ N-N ColorSystem-Colorants.
CALL sp_add_column_if_not_exists('colorsystem_colorants', 'formula_version', '`formula_version` INT NOT NULL DEFAULT 1 AFTER `amount_ml`');
CALL sp_add_column_if_not_exists('colorsystem_colorants', 'effective_from', '`effective_from` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `formula_version`');
CALL sp_add_column_if_not_exists('colorsystem_colorants', 'effective_to', '`effective_to` DATETIME NULL AFTER `effective_from`');
CALL sp_add_column_if_not_exists('colorsystem_colorants', 'is_active', '`is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `effective_to`');
CALL sp_rebuild_formula_primary_key_if_needed();
CALL sp_add_check_if_not_exists('colorsystem_colorants', 'chk_formula_version_positive', 'formula_version > 0');
CALL sp_add_check_if_not_exists('colorsystem_colorants', 'chk_formula_active_flag', 'is_active IN (0, 1)');
CALL sp_add_index_if_not_exists('colorsystem_colorants', 'idx_formula_active_lookup', '`color_id`, `formula_version`, `is_active`');

-- 3) Trạng thái pha màu/QC theo từng dòng đơn, không thêm MixingJobs để giữ ERD gọn.
CALL sp_add_column_if_not_exists('orderdetails', 'formula_version', '`formula_version` INT NOT NULL DEFAULT 1 AFTER `color_id`');
CALL sp_add_column_if_not_exists('orderdetails', 'mix_status', '`mix_status` VARCHAR(30) NOT NULL DEFAULT ''waiting'' AFTER `price_at_sale`');
CALL sp_add_column_if_not_exists('orderdetails', 'qc_status', '`qc_status` VARCHAR(30) NOT NULL DEFAULT ''pending'' AFTER `mix_status`');
CALL sp_add_column_if_not_exists('orderdetails', 'mixed_at', '`mixed_at` DATETIME NULL AFTER `qc_status`');
CALL sp_add_column_if_not_exists('orderdetails', 'qc_note', '`qc_note` VARCHAR(255) NULL AFTER `mixed_at`');
CALL sp_add_check_if_not_exists('orderdetails', 'chk_orderdetails_formula_version_positive', 'formula_version > 0');
CALL sp_add_check_if_not_exists('orderdetails', 'chk_orderdetails_mix_status', 'mix_status IN (''waiting'', ''mixing'', ''mixed'', ''delivered'', ''cancelled'')');
CALL sp_add_check_if_not_exists('orderdetails', 'chk_orderdetails_qc_status', 'qc_status IN (''pending'', ''passed'', ''failed'')');
CALL sp_add_index_if_not_exists('orderdetails', 'idx_orderdetails_order', '`order_id`');
CALL sp_add_index_if_not_exists('orderdetails', 'idx_orderdetails_variant_color', '`variant_id`, `color_id`');

-- 4) Bổ sung cột gọn cho inventory_movements, không thêm ledger phức tạp hơn.
CALL sp_add_column_if_not_exists('inventory_movements', 'item_id', '`item_id` INT NULL AFTER `inventory_type`');
CALL sp_add_column_if_not_exists('inventory_movements', 'created_by', '`created_by` INT NULL AFTER `note`');
CALL sp_add_column_if_not_exists('inventory_movements', 'order_detail_key', '`order_detail_key` VARCHAR(100) NULL AFTER `order_id`');
CALL sp_add_index_if_not_exists('inventory_movements', 'idx_inventory_movements_item_date', '`inventory_type`, `item_id`, `created_at`');
CALL sp_add_index_if_not_exists('inventory_movements', 'idx_inventory_movements_type_date', '`inventory_type`, `created_at`');

-- 5) Index theo truy vấn thật.
CALL sp_add_index_if_not_exists('orders', 'idx_orders_customer_date', '`customer_id`, `created_at`');
CALL sp_add_index_if_not_exists('orders', 'idx_orders_status_date', '`status`, `created_at`');
CALL sp_add_index_if_not_exists('payments', 'idx_payments_order_date', '`order_id`, `paid_at`');
CALL sp_add_index_if_not_exists('employees_shifts', 'idx_employee_shift_lookup', '`employee_id`, `shift_id`, `working_date`');
CALL sp_add_index_if_not_exists('baseinventory', 'idx_baseinventory_stock', '`stock_quantity`');

-- 6) View cập nhật theo BaseInventory + công thức version + trạng thái pha/QC.
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT pv.variant_id, pv.sku_code, pv.volume, pv.unit_price,
       bi.stock_quantity, bi.warehouse_location, bi.reorder_level,
       bt.base_id, bt.base_name, pl.line_id, pl.name AS line_name, pl.is_interior,
       br.brand_id, br.name AS brand_name
FROM productvariants pv
JOIN baseinventory bi ON pv.variant_id = bi.variant_id
JOIN basetypes bt ON pv.base_id = bt.base_id
JOIN productlines pl ON pv.line_id = pl.line_id
JOIN brands br ON pl.brand_id = br.brand_id;

CREATE OR REPLACE VIEW v_color_formula AS
SELECT cs.color_id, cs.color_code, cs.color_name, bt.base_name,
       f.formula_version, f.effective_from, f.effective_to, f.is_active,
       c.colorant_id, c.colorant_name, f.amount_ml, c.stock_ml
FROM colorsystem cs
JOIN basetypes bt ON cs.base_id = bt.base_id
JOIN colorsystem_colorants f ON cs.color_id = f.color_id
JOIN colorants c ON f.colorant_id = c.colorant_id;

CREATE OR REPLACE VIEW v_color_formula_current AS
SELECT *
FROM v_color_formula
WHERE is_active = 1 AND (effective_to IS NULL OR effective_to > NOW());

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
       od.formula_version,
       od.quantity,
       od.price_at_sale,
       od.mix_status,
       od.qc_status,
       od.mixed_at,
       od.qc_note
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
SELECT im.movement_id, im.created_at, im.inventory_type,
       COALESCE(im.item_id, im.variant_id, im.colorant_id) AS item_id,
       im.movement_type, im.order_id, im.order_detail_key,
       im.quantity_delta, im.before_quantity, im.after_quantity, im.note,
       pv.sku_code, c.colorant_name
FROM inventory_movements im
LEFT JOIN productvariants pv ON im.variant_id = pv.variant_id
LEFT JOIN colorants c ON im.colorant_id = c.colorant_id;

CREATE OR REPLACE VIEW v_low_stock_alert AS
SELECT 'base' AS inventory_type, bi.variant_id AS item_id, pv.sku_code AS item_name,
       bi.stock_quantity AS current_quantity, bi.reorder_level AS alert_level,
       bi.warehouse_location
FROM baseinventory bi
JOIN productvariants pv ON bi.variant_id = pv.variant_id
WHERE bi.stock_quantity <= bi.reorder_level
UNION ALL
SELECT 'colorant' AS inventory_type, c.colorant_id AS item_id, c.colorant_name AS item_name,
       c.stock_ml AS current_quantity, 1000 AS alert_level,
       NULL AS warehouse_location
FROM colorants c
WHERE c.stock_ml <= 1000;

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT DATE(created_at) AS revenue_date,
       COUNT(*) AS completed_orders,
       SUM(total_amount) AS gross_revenue,
       SUM(paid_amount) AS collected_amount,
       SUM(GREATEST(total_amount - paid_amount, 0)) AS new_debt
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);

CREATE OR REPLACE VIEW v_employee_performance AS
SELECT e.employee_id, e.full_name,
       SUM(CASE WHEN o.sales_rep_id = e.employee_id THEN 1 ELSE 0 END) AS sales_order_count,
       SUM(CASE WHEN o.tech_id = e.employee_id THEN 1 ELSE 0 END) AS tech_order_count,
       SUM(CASE WHEN o.sales_rep_id = e.employee_id THEN o.total_amount ELSE 0 END) AS sales_revenue
FROM employees e
LEFT JOIN orders o ON o.sales_rep_id = e.employee_id OR o.tech_id = e.employee_id
GROUP BY e.employee_id, e.full_name;

DELIMITER $$

-- Đồng bộ ProductVariants mới/chỉnh trực tiếp sang BaseInventory để seed cũ và thao tác SQL trực tiếp vẫn hoạt động.
DROP TRIGGER IF EXISTS trg_productvariants_ai_baseinventory$$
CREATE TRIGGER trg_productvariants_ai_baseinventory
AFTER INSERT ON productvariants
FOR EACH ROW
BEGIN
  INSERT INTO baseinventory (variant_id, stock_quantity, warehouse_location, reorder_level)
  VALUES (NEW.variant_id, NEW.stock_quantity, NEW.warehouse_location, 5)
  ON DUPLICATE KEY UPDATE
    stock_quantity = VALUES(stock_quantity),
    warehouse_location = VALUES(warehouse_location);
END$$

DROP TRIGGER IF EXISTS trg_productvariants_au_baseinventory$$
CREATE TRIGGER trg_productvariants_au_baseinventory
AFTER UPDATE ON productvariants
FOR EACH ROW
BEGIN
  IF NEW.stock_quantity <> OLD.stock_quantity OR COALESCE(NEW.warehouse_location, '') <> COALESCE(OLD.warehouse_location, '') THEN
    INSERT INTO baseinventory (variant_id, stock_quantity, warehouse_location, reorder_level)
    VALUES (NEW.variant_id, NEW.stock_quantity, NEW.warehouse_location, 5)
    ON DUPLICATE KEY UPDATE
      stock_quantity = VALUES(stock_quantity),
      warehouse_location = VALUES(warehouse_location);
  END IF;
END$$

-- 7) Rebuild trigger OrderDetails để dùng BaseInventory và formula_version.
DROP TRIGGER IF EXISTS trg_orderdetails_bi_validate$$
CREATE TRIGGER trg_orderdetails_bi_validate
BEFORE INSERT ON orderdetails
FOR EACH ROW
BEGIN
  DECLARE v_stock INT DEFAULT 0;
  DECLARE v_variant_base INT DEFAULT NULL;
  DECLARE v_color_base INT DEFAULT NULL;
  DECLARE v_missing_colorants INT DEFAULT 0;
  DECLARE v_formula_count INT DEFAULT 0;
  DECLARE v_active_formula_version INT DEFAULT NULL;
  DECLARE v_order_status VARCHAR(100) DEFAULT NULL;

  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_status IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể thêm chi tiết vào đơn đã hoàn tất hoặc đã hủy';
  END IF;

  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sản phẩm phải lớn hơn 0';
  END IF;

  SELECT bi.stock_quantity, pv.base_id INTO v_stock, v_variant_base
  FROM productvariants pv
  JOIN baseinventory bi ON pv.variant_id = bi.variant_id
  WHERE pv.variant_id = NEW.variant_id;

  SELECT base_id INTO v_color_base
  FROM colorsystem
  WHERE color_id = NEW.color_id;

  IF v_variant_base IS NULL OR v_color_base IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sản phẩm hoặc mã màu không tồn tại';
  END IF;

  IF v_stock < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho sơn gốc không đủ';
  END IF;

  IF v_variant_base <> v_color_base THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không tương thích với base của sản phẩm';
  END IF;

  IF NEW.formula_version IS NULL OR NEW.formula_version <= 0 THEN
    SELECT COALESCE(MAX(formula_version), 1) INTO v_active_formula_version
    FROM colorsystem_colorants
    WHERE color_id = NEW.color_id AND is_active = 1 AND (effective_to IS NULL OR effective_to > NOW());
    SET NEW.formula_version = v_active_formula_version;
  END IF;

  SELECT COUNT(*) INTO v_formula_count
  FROM colorsystem_colorants
  WHERE color_id = NEW.color_id
    AND formula_version = NEW.formula_version
    AND is_active = 1
    AND (effective_to IS NULL OR effective_to > NOW());

  IF v_formula_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy công thức màu active cho mã màu này';
  END IF;

  SELECT COUNT(*) INTO v_missing_colorants
  FROM colorsystem_colorants f
  JOIN colorants c ON f.colorant_id = c.colorant_id
  WHERE f.color_id = NEW.color_id
    AND f.formula_version = NEW.formula_version
    AND f.is_active = 1
    AND (f.effective_to IS NULL OR f.effective_to > NOW())
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
  INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'base', NEW.variant_id, NEW.order_id, CONCAT(NEW.order_id, ':', NEW.variant_id, ':', NEW.color_id), NEW.variant_id, NULL,
         'order_out', -NEW.quantity,
         stock_quantity, stock_quantity - NEW.quantity,
         'Trừ tồn kho sơn gốc khi thêm chi tiết đơn hàng'
  FROM baseinventory
  WHERE variant_id = NEW.variant_id;

  INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'colorant', c.colorant_id, NEW.order_id, CONCAT(NEW.order_id, ':', NEW.variant_id, ':', NEW.color_id), NULL, c.colorant_id,
         'formula_consumption', -(f.amount_ml * NEW.quantity),
         c.stock_ml, c.stock_ml - (f.amount_ml * NEW.quantity),
         CONCAT('Trừ tinh màu theo công thức version ', NEW.formula_version)
  FROM colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  WHERE f.color_id = NEW.color_id
    AND f.formula_version = NEW.formula_version
    AND f.is_active = 1
    AND (f.effective_to IS NULL OR f.effective_to > NOW());

  UPDATE baseinventory
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE variant_id = NEW.variant_id;

  UPDATE colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  SET c.stock_ml = c.stock_ml - (f.amount_ml * NEW.quantity)
  WHERE f.color_id = NEW.color_id
    AND f.formula_version = NEW.formula_version
    AND f.is_active = 1
    AND (f.effective_to IS NULL OR f.effective_to > NOW());

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

  IF NEW.variant_id <> OLD.variant_id OR NEW.color_id <> OLD.color_id OR NEW.formula_version <> OLD.formula_version THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi variant, màu hoặc formula_version trên dòng chi tiết; hãy xóa và thêm lại';
  END IF;

  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sản phẩm phải lớn hơn 0';
  END IF;

  SET v_extra = NEW.quantity - OLD.quantity;
  IF v_extra > 0 THEN
    SELECT stock_quantity INTO v_stock FROM baseinventory WHERE variant_id = NEW.variant_id;
    IF v_stock < v_extra THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho sơn gốc không đủ cho phần tăng thêm';
    END IF;

    SELECT COUNT(*) INTO v_missing_colorants
    FROM colorsystem_colorants f
    JOIN colorants c ON f.colorant_id = c.colorant_id
    WHERE f.color_id = NEW.color_id
      AND f.formula_version = NEW.formula_version
      AND f.is_active = 1
      AND (f.effective_to IS NULL OR f.effective_to > NOW())
      AND c.stock_ml < f.amount_ml * v_extra;

    IF v_missing_colorants > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho tinh màu không đủ cho phần tăng thêm';
    END IF;
  END IF;

  IF NEW.mix_status = 'mixed' AND OLD.mix_status <> 'mixed' AND NEW.mixed_at IS NULL THEN
    SET NEW.mixed_at = NOW();
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
    INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
    SELECT 'base', NEW.variant_id, NEW.order_id, CONCAT(NEW.order_id, ':', NEW.variant_id, ':', NEW.color_id), NEW.variant_id, NULL,
           'order_update_adjustment', -v_diff,
           stock_quantity, stock_quantity - v_diff,
           'Điều chỉnh tồn kho sơn gốc khi sửa số lượng'
    FROM baseinventory
    WHERE variant_id = NEW.variant_id;

    INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
    SELECT 'colorant', c.colorant_id, NEW.order_id, CONCAT(NEW.order_id, ':', NEW.variant_id, ':', NEW.color_id), NULL, c.colorant_id,
           'order_update_adjustment', -(f.amount_ml * v_diff),
           c.stock_ml, c.stock_ml - (f.amount_ml * v_diff),
           'Điều chỉnh tinh màu khi sửa số lượng'
    FROM colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    WHERE f.color_id = NEW.color_id
      AND f.formula_version = NEW.formula_version
      AND f.is_active = 1
      AND (f.effective_to IS NULL OR f.effective_to > NOW());

    UPDATE baseinventory
    SET stock_quantity = stock_quantity - v_diff
    WHERE variant_id = NEW.variant_id;

    UPDATE colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    SET c.stock_ml = c.stock_ml - (f.amount_ml * v_diff)
    WHERE f.color_id = NEW.color_id
      AND f.formula_version = NEW.formula_version
      AND f.is_active = 1
      AND (f.effective_to IS NULL OR f.effective_to > NOW());
  END IF;

  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * price_at_sale), 0)
    FROM orderdetails
    WHERE order_id = NEW.order_id
  )
  WHERE order_id = NEW.order_id;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_ad_restore_inventory$$
CREATE TRIGGER trg_orderdetails_ad_restore_inventory
AFTER DELETE ON orderdetails
FOR EACH ROW
BEGIN
  INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'base', OLD.variant_id, OLD.order_id, CONCAT(OLD.order_id, ':', OLD.variant_id, ':', OLD.color_id), OLD.variant_id, NULL,
         'order_cancel_restore', OLD.quantity,
         stock_quantity, stock_quantity + OLD.quantity,
         'Hoàn kho sơn gốc khi xóa chi tiết đơn hàng'
  FROM baseinventory
  WHERE variant_id = OLD.variant_id;

  INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
  SELECT 'colorant', c.colorant_id, OLD.order_id, CONCAT(OLD.order_id, ':', OLD.variant_id, ':', OLD.color_id), NULL, c.colorant_id,
         'order_cancel_restore', f.amount_ml * OLD.quantity,
         c.stock_ml, c.stock_ml + (f.amount_ml * OLD.quantity),
         'Hoàn kho tinh màu khi xóa chi tiết đơn hàng'
  FROM colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  WHERE f.color_id = OLD.color_id
    AND f.formula_version = OLD.formula_version;

  UPDATE baseinventory
  SET stock_quantity = stock_quantity + OLD.quantity
  WHERE variant_id = OLD.variant_id;

  UPDATE colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  SET c.stock_ml = c.stock_ml + (f.amount_ml * OLD.quantity)
  WHERE f.color_id = OLD.color_id
    AND f.formula_version = OLD.formula_version;

  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * price_at_sale), 0)
    FROM orderdetails
    WHERE order_id = OLD.order_id
  )
  WHERE order_id = OLD.order_id;
END$$

-- 8) Rebuild trigger Orders cancel để hoàn kho từ BaseInventory và formula_version đã lưu trong OrderDetails.
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
      INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
      SELECT 'base', od.variant_id, OLD.order_id, CONCAT(od.order_id, ':', od.variant_id, ':', od.color_id), od.variant_id, NULL,
             'order_cancel_restore', od.quantity,
             bi.stock_quantity, bi.stock_quantity + od.quantity,
             'Hoàn kho sơn gốc khi hủy đơn'
      FROM orderdetails od
      JOIN baseinventory bi ON od.variant_id = bi.variant_id
      WHERE od.order_id = OLD.order_id;

      INSERT INTO inventory_movements (inventory_type, item_id, order_id, order_detail_key, variant_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
      SELECT 'colorant', c.colorant_id, OLD.order_id, CONCAT(od.order_id, ':', od.variant_id, ':', od.color_id), NULL, c.colorant_id,
             'order_cancel_restore', f.amount_ml * od.quantity,
             c.stock_ml, c.stock_ml + (f.amount_ml * od.quantity),
             CONCAT('Hoàn kho tinh màu theo công thức version ', od.formula_version)
      FROM orderdetails od
      JOIN colorsystem_colorants f ON od.color_id = f.color_id AND od.formula_version = f.formula_version
      JOIN colorants c ON f.colorant_id = c.colorant_id
      WHERE od.order_id = OLD.order_id;

      UPDATE baseinventory bi
      JOIN orderdetails od ON bi.variant_id = od.variant_id
      SET bi.stock_quantity = bi.stock_quantity + od.quantity
      WHERE od.order_id = OLD.order_id;

      UPDATE colorants c
      JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
      JOIN orderdetails od ON f.color_id = od.color_id AND f.formula_version = od.formula_version
      SET c.stock_ml = c.stock_ml + (f.amount_ml * od.quantity)
      WHERE od.order_id = OLD.order_id;

      SET NEW.inventory_restored = 1;
    END IF;

    SET NEW.cancelled_at = NOW();
  END IF;
END$$

-- 9) Stored procedures: nghiệp vụ chính gọi từ backend, trigger là lớp phòng vệ cuối cùng.
DROP PROCEDURE IF EXISTS sp_create_order$$
CREATE PROCEDURE sp_create_order(
  IN p_customer_id INT,
  IN p_items_json JSON,
  IN p_street_address VARCHAR(255),
  IN p_ward_id INT
)
BEGIN
  DECLARE v_order_id INT DEFAULT NULL;
  DECLARE v_i INT DEFAULT 0;
  DECLARE v_len INT DEFAULT 0;
  DECLARE v_variant_id INT DEFAULT NULL;
  DECLARE v_color_id INT DEFAULT NULL;
  DECLARE v_quantity INT DEFAULT 0;
  DECLARE v_unit_price DECIMAL(14,2) DEFAULT NULL;
  DECLARE v_variant_base INT DEFAULT NULL;
  DECLARE v_color_base INT DEFAULT NULL;
  DECLARE v_base_stock INT DEFAULT 0;
  DECLARE v_formula_version INT DEFAULT NULL;
  DECLARE v_missing_colorants INT DEFAULT 0;
  DECLARE v_customer_address VARCHAR(255) DEFAULT NULL;
  DECLARE v_customer_ward_id INT DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_items_json IS NULL OR JSON_LENGTH(p_items_json) IS NULL OR JSON_LENGTH(p_items_json) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hàng phải có ít nhất một sản phẩm';
  END IF;

  START TRANSACTION;

  SELECT street_address, ward_id INTO v_customer_address, v_customer_ward_id
  FROM customers
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  INSERT INTO orders (customer_id, total_amount, status, street_address, ward_id)
  VALUES (p_customer_id, 0, 'pending', COALESCE(NULLIF(p_street_address, ''), v_customer_address), COALESCE(p_ward_id, v_customer_ward_id));

  SET v_order_id = LAST_INSERT_ID();
  SET v_len = JSON_LENGTH(p_items_json);

  WHILE v_i < v_len DO
    SET v_variant_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_i, '].variant_id'))) AS UNSIGNED);
    SET v_color_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_i, '].color_id'))) AS UNSIGNED);
    SET v_quantity = CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_i, '].quantity'))), '1') AS UNSIGNED);

    IF v_variant_id IS NULL OR v_color_id IS NULL OR v_quantity <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Dòng sản phẩm không hợp lệ';
    END IF;

    SET v_unit_price = NULL;
    SET v_variant_base = NULL;
    SET v_base_stock = 0;

    SELECT pv.unit_price, pv.base_id, bi.stock_quantity
    INTO v_unit_price, v_variant_base, v_base_stock
    FROM productvariants pv
    JOIN baseinventory bi ON pv.variant_id = bi.variant_id
    WHERE pv.variant_id = v_variant_id
    FOR UPDATE;

    IF v_unit_price IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy biến thể sản phẩm hoặc tồn kho sơn gốc';
    END IF;

    SELECT base_id INTO v_color_base
    FROM colorsystem
    WHERE color_id = v_color_id;

    IF v_color_base IS NULL OR v_variant_base <> v_color_base THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không tương thích với base của sản phẩm';
    END IF;

    IF v_base_stock < v_quantity THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho sơn gốc không đủ';
    END IF;

    SELECT MAX(formula_version) INTO v_formula_version
    FROM colorsystem_colorants
    WHERE color_id = v_color_id
      AND is_active = 1
      AND (effective_to IS NULL OR effective_to > NOW());

    IF v_formula_version IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy công thức màu active';
    END IF;

    -- Khóa các dòng tinh màu liên quan để chống race condition khi nhiều đơn tạo đồng thời.
    UPDATE colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    SET c.stock_ml = c.stock_ml
    WHERE f.color_id = v_color_id
      AND f.formula_version = v_formula_version
      AND f.is_active = 1
      AND (f.effective_to IS NULL OR f.effective_to > NOW());

    SELECT COUNT(*) INTO v_missing_colorants
    FROM colorsystem_colorants f
    JOIN colorants c ON f.colorant_id = c.colorant_id
    WHERE f.color_id = v_color_id
      AND f.formula_version = v_formula_version
      AND f.is_active = 1
      AND (f.effective_to IS NULL OR f.effective_to > NOW())
      AND c.stock_ml < f.amount_ml * v_quantity;

    IF v_missing_colorants > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho tinh màu không đủ để pha màu';
    END IF;

    INSERT INTO orderdetails (order_id, variant_id, color_id, formula_version, quantity, price_at_sale)
    VALUES (v_order_id, v_variant_id, v_color_id, v_formula_version, v_quantity, v_unit_price);

    SET v_i = v_i + 1;
  END WHILE;

  COMMIT;

  SELECT v_order_id AS order_id;
END$$

DROP PROCEDURE IF EXISTS sp_assign_order_staff$$
CREATE PROCEDURE sp_assign_order_staff(
  IN p_order_id INT,
  IN p_sales_rep_id INT,
  IN p_tech_id INT,
  IN p_shift_id INT
)
BEGIN
  DECLARE v_locked_order_id INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT order_id INTO v_locked_order_id FROM orders WHERE order_id = p_order_id FOR UPDATE;
  IF v_locked_order_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy đơn hàng';
  END IF;
  UPDATE orders
  SET sales_rep_id = p_sales_rep_id,
      tech_id = p_tech_id,
      shift_id = p_shift_id
  WHERE order_id = p_order_id;
  COMMIT;

  SELECT p_order_id AS order_id;
END$$

DROP PROCEDURE IF EXISTS sp_complete_order$$
CREATE PROCEDURE sp_complete_order(IN p_order_id INT)
BEGIN
  DECLARE v_locked_order_id INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT order_id INTO v_locked_order_id FROM orders WHERE order_id = p_order_id FOR UPDATE;
  IF v_locked_order_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy đơn hàng';
  END IF;
  UPDATE orders SET status = 'completed' WHERE order_id = p_order_id;
  COMMIT;

  SELECT p_order_id AS order_id;
END$$

DROP PROCEDURE IF EXISTS sp_cancel_order$$
CREATE PROCEDURE sp_cancel_order(IN p_order_id INT)
BEGIN
  DECLARE v_locked_order_id INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT order_id INTO v_locked_order_id FROM orders WHERE order_id = p_order_id FOR UPDATE;
  IF v_locked_order_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy đơn hàng';
  END IF;
  UPDATE orders SET status = 'cancelled' WHERE order_id = p_order_id;
  COMMIT;

  SELECT p_order_id AS order_id;
END$$

DROP PROCEDURE IF EXISTS sp_record_payment$$
CREATE PROCEDURE sp_record_payment(
  IN p_order_id INT,
  IN p_amount DECIMAL(14,2),
  IN p_payment_method VARCHAR(50),
  IN p_note VARCHAR(255)
)
BEGIN
  DECLARE v_locked_order_id INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT order_id INTO v_locked_order_id FROM orders WHERE order_id = p_order_id FOR UPDATE;
  IF v_locked_order_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy đơn hàng';
  END IF;
  INSERT INTO payments (order_id, amount, payment_method, note)
  VALUES (p_order_id, p_amount, COALESCE(NULLIF(p_payment_method, ''), 'cash'), p_note);
  COMMIT;

  SELECT p_order_id AS order_id;
END$$

DROP PROCEDURE IF EXISTS sp_adjust_inventory$$
CREATE PROCEDURE sp_adjust_inventory(
  IN p_inventory_type VARCHAR(20),
  IN p_item_id INT,
  IN p_quantity_delta DECIMAL(14,2),
  IN p_note VARCHAR(255)
)
BEGIN
  DECLARE v_before DECIMAL(14,2) DEFAULT 0;
  DECLARE v_after DECIMAL(14,2) DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantity_delta = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng điều chỉnh phải khác 0';
  END IF;

  START TRANSACTION;

  IF p_inventory_type = 'base' THEN
    SELECT stock_quantity INTO v_before
    FROM baseinventory
    WHERE variant_id = p_item_id
    FOR UPDATE;

    SET v_after = v_before + p_quantity_delta;
    IF v_after < 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Điều chỉnh làm tồn kho sơn gốc âm';
    END IF;

    UPDATE baseinventory SET stock_quantity = v_after WHERE variant_id = p_item_id;
    INSERT INTO inventory_movements (inventory_type, item_id, variant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
    VALUES ('base', p_item_id, p_item_id, 'manual_adjustment', p_quantity_delta, v_before, v_after, p_note);

  ELSEIF p_inventory_type = 'colorant' THEN
    SELECT stock_ml INTO v_before
    FROM colorants
    WHERE colorant_id = p_item_id
    FOR UPDATE;

    SET v_after = v_before + p_quantity_delta;
    IF v_after < 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Điều chỉnh làm tồn kho tinh màu âm';
    END IF;

    UPDATE colorants SET stock_ml = v_after WHERE colorant_id = p_item_id;
    INSERT INTO inventory_movements (inventory_type, item_id, colorant_id, movement_type, quantity_delta, before_quantity, after_quantity, note)
    VALUES ('colorant', p_item_id, p_item_id, 'manual_adjustment', p_quantity_delta, v_before, v_after, p_note);
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'inventory_type không hợp lệ';
  END IF;

  COMMIT;
END$$

DELIMITER ;

-- Cleanup helper procedures; giữ lại procedure nghiệp vụ.
DROP PROCEDURE IF EXISTS sp_add_column_if_not_exists;
DROP PROCEDURE IF EXISTS sp_add_check_if_not_exists;
DROP PROCEDURE IF EXISTS sp_add_index_if_not_exists;
DROP PROCEDURE IF EXISTS sp_rebuild_formula_primary_key_if_needed;
