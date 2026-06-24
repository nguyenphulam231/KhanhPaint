USE `khanhpaintdealerdatabase`;

-- Chạy file này SAU khanhpaintdatabasewithdata.sql.
-- Bản cải tiến theo ERD mới, không tạo thêm bảng.
-- Mục tiêu: bổ sung thuộc tính cần thiết, ràng buộc nghiệp vụ, view báo cáo và trigger tồn kho/truy vết.

SET FOREIGN_KEY_CHECKS = 0;

-- Sửa dữ liệu demo bị trùng để có thể thêm UNIQUE KEY.
UPDATE basetypes
SET base_name = 'Base C',
    description = 'Là sơn gốc có hàm lượng pigment trắng thấp, chuyên dùng pha màu đậm hoặc màu có độ bão hòa cao.'
WHERE base_id = 3 AND base_name = 'Base B';

UPDATE productlines
SET name = 'Jotashield Bền Màu Toàn Diện Cao Cấp'
WHERE line_id = 2 AND name = 'Jotashield Bền Màu Toàn Diện';

SET FOREIGN_KEY_CHECKS = 1;

DELIMITER $$

DROP PROCEDURE IF EXISTS kp_add_column$$
CREATE PROCEDURE kp_add_column(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS kp_add_unique$$
CREATE PROCEDURE kp_add_unique(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_columns TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_index, '` UNIQUE (', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS kp_add_index$$
CREATE PROCEDURE kp_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_columns TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS kp_add_check$$
CREATE PROCEDURE kp_add_check(IN p_table VARCHAR(64), IN p_constraint VARCHAR(64), IN p_expression TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND constraint_name = p_constraint
      AND constraint_type = 'CHECK'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_constraint, '` CHECK (', p_expression, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- Bổ sung thuộc tính thời gian cho Orders để kiểm tra ca làm theo đúng ngày phát sinh đơn.
CALL kp_add_column('orders', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `status`');

-- Bổ sung ràng buộc duy nhất.
CALL kp_add_unique('brands', 'uk_brands_name', '`name`');
CALL kp_add_unique('basetypes', 'uk_basetypes_name', '`base_name`');
CALL kp_add_unique('colorants', 'uk_colorants_name', '`colorant_name`');
CALL kp_add_unique('colorsystem', 'uk_colorsystem_code', '`color_code`');
CALL kp_add_unique('customers', 'uk_customers_email', '`email`');
CALL kp_add_unique('productvariants', 'uk_productvariants_sku', '`sku_code`');
CALL kp_add_unique('jobs', 'uk_jobs_title', '`job_title`');

-- Bổ sung index phục vụ truy vấn dashboard/truy vết.
CALL kp_add_index('orders', 'idx_orders_status_created', '`status`, `created_at`');
CALL kp_add_index('orderdetails', 'idx_orderdetails_color', '`color_id`');
CALL kp_add_index('productvariants', 'idx_variants_line_base', '`line_id`, `base_id`');
CALL kp_add_index('employees_shifts', 'idx_employee_shift_date', '`shift_id`, `working_date`, `employee_id`');

-- Bổ sung CHECK CONSTRAINT cho dữ liệu số, trạng thái và thời gian.
CALL kp_add_check('colorants', 'chk_colorants_stock_nonnegative', '`stock_ml` >= 0');
CALL kp_add_check('colorants', 'chk_colorants_price_nonnegative', '`unit_price_per_ml` >= 0');
CALL kp_add_check('colorsystem_colorants', 'chk_formula_amount_positive', '`amount_ml` > 0');
CALL kp_add_check('customers', 'chk_customers_credit_nonnegative', '`credit_limit` >= 0');
CALL kp_add_check('customers', 'chk_customers_debt_nonnegative', '`current_debt` >= 0');
CALL kp_add_check('customers', 'chk_customers_debt_limit', '`current_debt` <= `credit_limit` OR `credit_limit` = 0');
CALL kp_add_check('jobs', 'chk_jobs_salary_nonnegative', '(`min_salary` IS NULL OR `min_salary` >= 0) AND (`max_salary` IS NULL OR `max_salary` >= 0)');
CALL kp_add_check('jobs', 'chk_jobs_salary_range', '`min_salary` IS NULL OR `max_salary` IS NULL OR `min_salary` <= `max_salary`');
CALL kp_add_check('productvariants', 'chk_variants_price_nonnegative', '`unit_price` >= 0');
CALL kp_add_check('productvariants', 'chk_variants_stock_nonnegative', '`stock_quantity` >= 0');
CALL kp_add_check('orders', 'chk_orders_total_nonnegative', '`total_amount` >= 0');
CALL kp_add_check('orders', 'chk_orders_status', '`status` IN (''pending'', ''confirmed'', ''mixing'', ''completed'', ''cancelled'')');
CALL kp_add_check('orderdetails', 'chk_orderdetails_quantity_positive', '`quantity` > 0');
CALL kp_add_check('orderdetails', 'chk_orderdetails_price_nonnegative', '`price_at_sale` >= 0');
CALL kp_add_check('shifts', 'chk_shifts_time_range', '`start_time` < `end_time`');
CALL kp_add_check('employees', 'chk_employees_role', '`role` IN (''admin'', ''staff'')');

DROP PROCEDURE IF EXISTS kp_add_column;
DROP PROCEDURE IF EXISTS kp_add_unique;
DROP PROCEDURE IF EXISTS kp_add_index;
DROP PROCEDURE IF EXISTS kp_add_check;

-- View phục vụ dashboard và thuyết trình.
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT pv.variant_id, pv.sku_code, pv.volume, pv.unit_price, pv.stock_quantity, pv.warehouse_location,
       bt.base_id, bt.base_name, pl.line_id, pl.name AS line_name, pl.is_interior,
       pl.coverage_rate, pl.drying_time, pl.gloss_level, pl.recommended_layers,
       br.brand_id, br.name AS brand_name
FROM productvariants pv
JOIN basetypes bt ON pv.base_id = bt.base_id
JOIN productlines pl ON pv.line_id = pl.line_id
JOIN brands br ON pl.brand_id = br.brand_id;

CREATE OR REPLACE VIEW v_color_formula AS
SELECT cs.color_id, cs.color_code, cs.color_name, bt.base_id, bt.base_name,
       c.colorant_id, c.colorant_name, f.amount_ml, c.stock_ml,
       CASE WHEN c.stock_ml < f.amount_ml THEN 0 ELSE FLOOR(c.stock_ml / f.amount_ml) END AS max_mixable_units
FROM colorsystem cs
JOIN basetypes bt ON cs.base_id = bt.base_id
JOIN colorsystem_colorants f ON cs.color_id = f.color_id
JOIN colorants c ON f.colorant_id = c.colorant_id;

CREATE OR REPLACE VIEW v_order_trace AS
SELECT o.order_id, o.status, o.created_at, o.total_amount,
       c.customer_id, c.name AS customer_name, c.phone AS customer_phone,
       sales.employee_id AS sales_rep_id, sales.full_name AS sales_rep_name,
       sales_job.job_title AS sales_job_title,
       tech.employee_id AS tech_id, tech.full_name AS tech_name,
       tech_job.job_title AS tech_job_title,
       s.shift_id, s.shift_name,
       CONCAT(COALESCE(o.street_address, ''), CASE WHEN w.ward_name IS NULL THEN '' ELSE CONCAT(', ', w.ward_name) END, CASE WHEN p.province_name IS NULL THEN '' ELSE CONCAT(', ', p.province_name) END) AS delivery_address,
       br.name AS brand_name,
       pl.name AS line_name,
       pv.variant_id, pv.sku_code,
       bt.base_name,
       cs.color_id, cs.color_code, cs.color_name,
       od.quantity,
       od.price_at_sale,
       od.quantity * od.price_at_sale AS line_total
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN employees sales ON o.sales_rep_id = sales.employee_id
LEFT JOIN jobs sales_job ON sales.job_id = sales_job.job_id
LEFT JOIN employees tech ON o.tech_id = tech.employee_id
LEFT JOIN jobs tech_job ON tech.job_id = tech_job.job_id
LEFT JOIN shifts s ON o.shift_id = s.shift_id
LEFT JOIN wards w ON o.ward_id = w.ward_id
LEFT JOIN provinces p ON w.province_id = p.province_id
JOIN orderdetails od ON o.order_id = od.order_id
JOIN productvariants pv ON od.variant_id = pv.variant_id
JOIN productlines pl ON pv.line_id = pl.line_id
JOIN brands br ON pl.brand_id = br.brand_id
JOIN basetypes bt ON pv.base_id = bt.base_id
JOIN colorsystem cs ON od.color_id = cs.color_id;

DELIMITER $$

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
  DECLARE v_order_status VARCHAR(100) DEFAULT NULL;
  DECLARE v_order_count INT DEFAULT 0;

  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sản phẩm phải lớn hơn 0';
  END IF;

  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hàng không tồn tại';
  END IF;

  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = NEW.order_id;

  IF v_order_status IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được thêm chi tiết vào đơn đã hoàn tất hoặc đã hủy';
  END IF;

  SELECT stock_quantity, base_id INTO v_stock, v_variant_base
  FROM productvariants
  WHERE variant_id = NEW.variant_id;

  SELECT base_id INTO v_color_base
  FROM colorsystem
  WHERE color_id = NEW.color_id;

  IF v_stock < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho sơn gốc không đủ';
  END IF;

  IF v_variant_base <> v_color_base THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không tương thích với base của sản phẩm';
  END IF;

  SELECT COUNT(*) INTO v_formula_count
  FROM colorsystem_colorants
  WHERE color_id = NEW.color_id;

  IF v_formula_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu chưa có công thức pha màu';
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
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được sửa chi tiết của đơn đã hoàn tất hoặc đã hủy';
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

  UPDATE productvariants
  SET stock_quantity = stock_quantity - v_diff
  WHERE variant_id = NEW.variant_id;

  UPDATE colorants c
  JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
  SET c.stock_ml = c.stock_ml - (f.amount_ml * v_diff)
  WHERE f.color_id = NEW.color_id;

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
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_order_status = NULL;

  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = OLD.order_id;

  IF v_order_status IN ('completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được xóa chi tiết của đơn đã hoàn tất hoặc đã hủy';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orderdetails_ad_restore_inventory$$
CREATE TRIGGER trg_orderdetails_ad_restore_inventory
AFTER DELETE ON orderdetails
FOR EACH ROW
BEGIN
  DECLARE v_order_status VARCHAR(100) DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_order_status = NULL;

  SELECT status INTO v_order_status
  FROM orders
  WHERE order_id = OLD.order_id;

  IF v_order_status IS NULL OR v_order_status <> 'cancelled' THEN
    UPDATE productvariants
    SET stock_quantity = stock_quantity + OLD.quantity
    WHERE variant_id = OLD.variant_id;

    UPDATE colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    SET c.stock_ml = c.stock_ml + (f.amount_ml * OLD.quantity)
    WHERE f.color_id = OLD.color_id;
  END IF;

  IF v_order_status IS NOT NULL THEN
    UPDATE orders
    SET total_amount = (
      SELECT COALESCE(SUM(quantity * price_at_sale), 0)
      FROM orderdetails
      WHERE order_id = OLD.order_id
    )
    WHERE order_id = OLD.order_id;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orders_bi_validate$$
CREATE TRIGGER trg_orders_bi_validate
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NEW.status IS NULL OR NEW.status = '' THEN
    SET NEW.status = 'pending';
  END IF;

  IF NEW.created_at IS NULL THEN
    SET NEW.created_at = CURRENT_TIMESTAMP;
  END IF;

  IF NEW.total_amount < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tổng tiền đơn hàng không được âm';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orders_bu_validate$$
CREATE TRIGGER trg_orders_bu_validate
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_is_admin INT DEFAULT 0;

  IF NEW.total_amount < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tổng tiền đơn hàng không được âm';
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn đã hủy không được mở lại để tránh sai tồn kho';
  END IF;

  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn đã hoàn tất không được chuyển ngược trạng thái';
  END IF;

  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'confirmed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn pending chỉ được xác nhận hoặc hủy';
  END IF;

  IF OLD.status = 'confirmed' AND NEW.status NOT IN ('confirmed', 'mixing', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn confirmed chỉ được chuyển sang mixing hoặc hủy';
  END IF;

  IF OLD.status = 'mixing' AND NEW.status NOT IN ('mixing', 'completed', 'cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn mixing chỉ được hoàn tất hoặc hủy';
  END IF;

  IF NEW.sales_rep_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM employees e
    LEFT JOIN jobs j ON e.job_id = j.job_id
    WHERE e.employee_id = NEW.sales_rep_id
      AND (e.role = 'admin' OR j.job_title LIKE '%Bán%' OR j.job_title LIKE '%Kinh doanh%');

    IF v_count = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sales_rep_id phải là nhân viên bán hàng hoặc admin';
    END IF;
  END IF;

  IF NEW.tech_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM employees e
    LEFT JOIN jobs j ON e.job_id = j.job_id
    WHERE e.employee_id = NEW.tech_id
      AND (e.role = 'admin' OR j.job_title LIKE '%Kỹ thuật%' OR j.job_title LIKE '%Pha màu%' OR j.job_title LIKE '%pha màu%');

    IF v_count = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tech_id phải là kỹ thuật viên pha màu hoặc admin';
    END IF;
  END IF;

  IF (NEW.sales_rep_id IS NOT NULL OR NEW.tech_id IS NOT NULL) AND NEW.shift_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khi gán nhân sự cho đơn hàng phải gán cả ca làm';
  END IF;

  IF NEW.sales_rep_id IS NOT NULL AND NEW.shift_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_is_admin FROM employees WHERE employee_id = NEW.sales_rep_id AND role = 'admin';
    IF v_is_admin = 0 THEN
      SELECT COUNT(*) INTO v_count
      FROM employees_shifts
      WHERE employee_id = NEW.sales_rep_id
        AND shift_id = NEW.shift_id
        AND working_date = DATE(NEW.created_at);

      IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nhân viên bán hàng không được phân vào ca của ngày tạo đơn';
      END IF;
    END IF;
  END IF;

  IF NEW.tech_id IS NOT NULL AND NEW.shift_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_is_admin FROM employees WHERE employee_id = NEW.tech_id AND role = 'admin';
    IF v_is_admin = 0 THEN
      SELECT COUNT(*) INTO v_count
      FROM employees_shifts
      WHERE employee_id = NEW.tech_id
        AND shift_id = NEW.shift_id
        AND working_date = DATE(NEW.created_at);

      IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kỹ thuật viên không được phân vào ca của ngày tạo đơn';
      END IF;
    END IF;
  END IF;

  IF NEW.status = 'completed' AND (NEW.sales_rep_id IS NULL OR NEW.tech_id IS NULL OR NEW.shift_id IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hoàn tất phải có nhân viên bán, kỹ thuật viên và ca làm';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_orders_au_restore_inventory_on_cancel$$
CREATE TRIGGER trg_orders_au_restore_inventory_on_cancel
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE productvariants pv
    JOIN orderdetails od ON pv.variant_id = od.variant_id
    SET pv.stock_quantity = pv.stock_quantity + od.quantity
    WHERE od.order_id = NEW.order_id;

    UPDATE colorants c
    JOIN colorsystem_colorants f ON c.colorant_id = f.colorant_id
    JOIN orderdetails od ON f.color_id = od.color_id
    SET c.stock_ml = c.stock_ml + (f.amount_ml * od.quantity)
    WHERE od.order_id = NEW.order_id;
  END IF;
END$$

DELIMITER ;

-- Bổ sung khóa nghiệp vụ để giữ lịch sử pha màu/đơn hàng ổn định sau khi đã phát sinh giao dịch.
DELIMITER $$

DROP TRIGGER IF EXISTS trg_formula_bi_validate$$
CREATE TRIGGER trg_formula_bi_validate
BEFORE INSERT ON colorsystem_colorants
FOR EACH ROW
BEGIN
  IF NEW.amount_ml <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lượng tinh màu trong công thức phải lớn hơn 0 ml';
  END IF;

  IF NEW.amount_ml > 5000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lượng tinh màu trong công thức vượt ngưỡng hợp lý';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_formula_bu_validate$$
CREATE TRIGGER trg_formula_bu_validate
BEFORE UPDATE ON colorsystem_colorants
FOR EACH ROW
BEGIN
  DECLARE v_used_count INT DEFAULT 0;

  IF NEW.amount_ml <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lượng tinh màu trong công thức phải lớn hơn 0 ml';
  END IF;

  IF NEW.amount_ml > 5000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lượng tinh màu trong công thức vượt ngưỡng hợp lý';
  END IF;

  SELECT COUNT(*) INTO v_used_count
  FROM orderdetails od
  JOIN orders o ON od.order_id = o.order_id
  WHERE od.color_id = OLD.color_id
    AND o.status <> 'cancelled';

  IF v_used_count > 0 AND (
       NEW.color_id <> OLD.color_id
       OR NEW.colorant_id <> OLD.colorant_id
       OR NEW.amount_ml <> OLD.amount_ml
     ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được sửa công thức màu đã dùng trong đơn hàng chưa hủy';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_formula_bd_validate$$
CREATE TRIGGER trg_formula_bd_validate
BEFORE DELETE ON colorsystem_colorants
FOR EACH ROW
BEGIN
  DECLARE v_used_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_used_count
  FROM orderdetails od
  JOIN orders o ON od.order_id = o.order_id
  WHERE od.color_id = OLD.color_id
    AND o.status <> 'cancelled';

  IF v_used_count > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được xóa công thức màu đã dùng trong đơn hàng chưa hủy';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_colorsystem_bu_validate$$
CREATE TRIGGER trg_colorsystem_bu_validate
BEFORE UPDATE ON colorsystem
FOR EACH ROW
BEGIN
  DECLARE v_used_count INT DEFAULT 0;

  IF NEW.color_code IS NULL OR TRIM(NEW.color_code) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã màu không được để trống';
  END IF;

  IF NEW.color_name IS NULL OR TRIM(NEW.color_name) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tên màu không được để trống';
  END IF;

  IF NEW.base_id <> OLD.base_id THEN
    SELECT COUNT(*) INTO v_used_count
    FROM orderdetails od
    JOIN orders o ON od.order_id = o.order_id
    WHERE od.color_id = OLD.color_id
      AND o.status <> 'cancelled';

    IF v_used_count > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi base của màu đã dùng trong đơn hàng chưa hủy';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_productvariants_bu_validate$$
CREATE TRIGGER trg_productvariants_bu_validate
BEFORE UPDATE ON productvariants
FOR EACH ROW
BEGIN
  DECLARE v_used_count INT DEFAULT 0;

  IF NEW.unit_price < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn giá product variant không được âm';
  END IF;

  IF NEW.stock_quantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho product variant không được âm';
  END IF;

  IF NEW.sku_code IS NULL OR TRIM(NEW.sku_code) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SKU không được để trống';
  END IF;

  IF NEW.base_id <> OLD.base_id OR NEW.line_id <> OLD.line_id THEN
    SELECT COUNT(*) INTO v_used_count
    FROM orderdetails od
    JOIN orders o ON od.order_id = o.order_id
    WHERE od.variant_id = OLD.variant_id
      AND o.status <> 'cancelled';

    IF v_used_count > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi dòng sản phẩm/base của variant đã dùng trong đơn hàng chưa hủy';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_productvariants_bi_validate$$
CREATE TRIGGER trg_productvariants_bi_validate
BEFORE INSERT ON productvariants
FOR EACH ROW
BEGIN
  IF NEW.unit_price < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn giá product variant không được âm';
  END IF;

  IF NEW.stock_quantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tồn kho product variant không được âm';
  END IF;

  IF NEW.sku_code IS NULL OR TRIM(NEW.sku_code) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SKU không được để trống';
  END IF;
END$$

DELIMITER ;
