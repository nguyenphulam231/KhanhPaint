USE `khanhpaintdealerdatabase`;

-- Chạy file này SAU khanhpaintdatabasewithdata.sql.
-- Mục tiêu: chuẩn hóa dữ liệu, thêm ràng buộc nghiệp vụ, view báo cáo và trigger tự động trừ tồn kho.

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

-- Bổ sung ràng buộc duy nhất. Nếu chạy lại và báo Duplicate key name thì bỏ qua phần ALTER tương ứng.
ALTER TABLE brands ADD CONSTRAINT uk_brands_name UNIQUE (name);
ALTER TABLE basetypes ADD CONSTRAINT uk_basetypes_name UNIQUE (base_name);
ALTER TABLE colorants ADD CONSTRAINT uk_colorants_name UNIQUE (colorant_name);
ALTER TABLE colorsystem ADD CONSTRAINT uk_colorsystem_code UNIQUE (color_code);
ALTER TABLE customers ADD CONSTRAINT uk_customers_email UNIQUE (email);
ALTER TABLE productvariants ADD CONSTRAINT uk_productvariants_sku UNIQUE (sku_code);
ALTER TABLE jobs ADD CONSTRAINT uk_jobs_title UNIQUE (job_title);

-- Bổ sung CHECK CONSTRAINT cho dữ liệu số và trạng thái.
ALTER TABLE colorants
  ADD CONSTRAINT chk_colorants_stock_nonnegative CHECK (stock_ml >= 0),
  ADD CONSTRAINT chk_colorants_price_nonnegative CHECK (unit_price_per_ml >= 0);

ALTER TABLE colorsystem_colorants
  ADD CONSTRAINT chk_formula_amount_positive CHECK (amount_ml > 0);

ALTER TABLE customers
  ADD CONSTRAINT chk_customers_credit_nonnegative CHECK (credit_limit >= 0),
  ADD CONSTRAINT chk_customers_debt_nonnegative CHECK (current_debt >= 0),
  ADD CONSTRAINT chk_customers_debt_limit CHECK (current_debt <= credit_limit OR credit_limit = 0);

ALTER TABLE jobs
  ADD CONSTRAINT chk_jobs_salary_nonnegative CHECK ((min_salary IS NULL OR min_salary >= 0) AND (max_salary IS NULL OR max_salary >= 0)),
  ADD CONSTRAINT chk_jobs_salary_range CHECK (min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary);

ALTER TABLE productvariants
  ADD CONSTRAINT chk_variants_price_nonnegative CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_variants_stock_nonnegative CHECK (stock_quantity >= 0);

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_total_nonnegative CHECK (total_amount >= 0),
  ADD CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'confirmed', 'mixing', 'completed', 'cancelled'));

ALTER TABLE orderdetails
  ADD CONSTRAINT chk_orderdetails_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT chk_orderdetails_price_nonnegative CHECK (price_at_sale >= 0);

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
SELECT o.order_id, o.status, o.total_amount,
       c.name AS customer_name,
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

DROP TRIGGER IF EXISTS trg_orderdetails_ad_restore_inventory$$
CREATE TRIGGER trg_orderdetails_ad_restore_inventory
AFTER DELETE ON orderdetails
FOR EACH ROW
BEGIN
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

DELIMITER ;
