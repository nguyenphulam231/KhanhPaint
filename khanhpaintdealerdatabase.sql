CREATE DATABASE IF NOT EXISTS `khanhpaintdealerdatabase` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `khanhpaintdealerdatabase`;

CREATE TABLE `basetypes` (
  `base_id` int NOT NULL AUTO_INCREMENT,
  `base_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`base_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `brands` (
  `brand_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `origin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00', -- Mức chiết khấu ký gửi (%) bổ sung
  PRIMARY KEY (`brand_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `colorants` (
  `colorant_id` int NOT NULL AUTO_INCREMENT,
  `colorant_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stock_ml` decimal(12,2) NOT NULL DEFAULT '0.00',
  `unit_price_per_ml` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`colorant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `colorsystem` (
  `color_id` int NOT NULL AUTO_INCREMENT,
  `color_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_id` int NOT NULL,
  PRIMARY KEY (`color_id`),
  KEY `base_id` (`base_id`),
  CONSTRAINT `colorsystem_ibfk_1` FOREIGN KEY (`base_id`) REFERENCES `basetypes` (`base_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `colorsystem_colorants` (
  `color_id` int NOT NULL,
  `colorant_id` int NOT NULL,
  `amount_ml` decimal(12,2) NOT NULL,
  PRIMARY KEY (`color_id`,`colorant_id`),
  KEY `colorant_id` (`colorant_id`),
  CONSTRAINT `colorsystem_colorants_ibfk_1` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `colorsystem_colorants_ibfk_2` FOREIGN KEY (`colorant_id`) REFERENCES `colorants` (`colorant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `provinces` (
  `province_id` int NOT NULL AUTO_INCREMENT,
  `province_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`province_id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wards` (
  `ward_id` int NOT NULL AUTO_INCREMENT,
  `province_id` int NOT NULL,
  `ward_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ward_id`),
  KEY `province_id` (`province_id`),
  CONSTRAINT `fk_wards_provinces` FOREIGN KEY (`province_id`) REFERENCES `provinces` (`province_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3314 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `street_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ward_id` int DEFAULT NULL,
  `credit_limit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `current_debt` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`customer_id`),
  KEY `fk_customers_wards` (`ward_id`),
  CONSTRAINT `fk_customers_wards` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`ward_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `job_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_salary` decimal(14,2) DEFAULT NULL,
  `max_salary` decimal(14,2) DEFAULT NULL,
  PRIMARY KEY (`job_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_id` int DEFAULT NULL,
  `salary` decimal(14,2) DEFAULT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'staff',
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `email` (`email`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`job_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
  `shift_id` int NOT NULL AUTO_INCREMENT,
  `shift_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`shift_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees_shifts` (
  `employee_id` int NOT NULL,
  `shift_id` int NOT NULL,
  `working_date` date NOT NULL,
  PRIMARY KEY (`employee_id`,`shift_id`,`working_date`),
  KEY `shift_id` (`shift_id`),
  CONSTRAINT `employees_shifts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `employees_shifts_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `sales_rep_id` int DEFAULT NULL,
  `tech_id` int DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `street_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ward_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `sales_rep_id` (`sales_rep_id`),
  KEY `tech_id` (`tech_id`),
  KEY `shift_id` (`shift_id`),
  KEY `fk_orders_wards` (`ward_id`),
  CONSTRAINT `fk_orders_wards` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`ward_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`sales_rep_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`tech_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_4` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `productlines` (
  `line_id` int NOT NULL AUTO_INCREMENT,
  `brand_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_interior` tinyint(1) NOT NULL DEFAULT '0',
  `coverage_rate` decimal(8,2) DEFAULT NULL,
  `drying_time` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gloss_level` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recommended_layers` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`line_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `productlines_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `productvariants` (
  `variant_id` int NOT NULL AUTO_INCREMENT,
  `line_id` int NOT NULL,
  `base_id` int NOT NULL,
  `volume` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `warehouse_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`variant_id`),
  KEY `line_id` (`line_id`),
  KEY `base_id` (`base_id`),
  CONSTRAINT `fk_variant_base` FOREIGN KEY (`base_id`) REFERENCES `basetypes` (`base_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_variant_line` FOREIGN KEY (`line_id`) REFERENCES `productlines` (`line_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orderdetails` (
  `order_id` int NOT NULL,
  `variant_id` int NOT NULL,
  `color_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price_at_sale` decimal(14,2) NOT NULL,
  `cost_price_at_sale` decimal(14,2) NOT NULL DEFAULT '0.00', -- Giá vốn ký gửi tại thời điểm bán bổ sung
  PRIMARY KEY (`order_id`,`variant_id`,`color_id`),
  KEY `variant_id` (`variant_id`),
  KEY `color_id` (`color_id`),
  CONSTRAINT `orderdetails_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orderdetails_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `productvariants` (`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orderdetails_ibfk_3` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `financial_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `type` enum('INCOME', 'EXPENSE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, 
  `amount` decimal(14,2) NOT NULL, 
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, 
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- TRIGGER TỰ ĐỘNG TÍNH GIÁ VỐN KÝ GỬI KHI INSERT VÀO ORDERDETAILS
-- -------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER before_orderdetails_insert
BEFORE INSERT ON orderdetails
FOR EACH ROW
BEGIN
    DECLARE current_unit_price DECIMAL(12,2);
    DECLARE current_brand_discount DECIMAL(5,2);

    -- Tìm giá niêm yết của biến thể sản phẩm và tỷ lệ chiết khấu hiện hành của Hãng
    SELECT pv.unit_price, b.discount_percentage 
    INTO current_unit_price, current_brand_discount
    FROM productvariants pv
    JOIN productlines pl ON pv.line_id = pl.line_id
    JOIN brands b ON pl.brand_id = b.brand_id
    WHERE pv.variant_id = NEW.variant_id;

    -- Tự động tính số tiền đại lý phải thanh toán lại cho hãng (Giá vốn ký gửi)
    SET NEW.cost_price_at_sale = current_unit_price * (1 - (current_brand_discount / 100));
END$$

DELIMITER ;


-- -------------------------------------------------------------------------
-- TRIGGER 2: PHÒNG THỦ BẢNG ORDERDETAILS (CHẶN SỐ LƯỢNG ÂM VÀ GIÁ < 0)
-- -------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER check_orderdetails_before_insert
BEFORE INSERT ON orderdetails
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Loi phong thu: So luong san pham mua phai lon hon 0!';
    END IF;
    
    IF NEW.price_at_sale < 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Loi phong thu: Gia ban khong duoc la so am!';
    END IF;
END$$

DELIMITER ;

-- -------------------------------------------------------------------------
-- TRIGGER 3: PHÒNG THỦ BẢNG CUSTOMERS (CHẶN CÔNG NỢ VƯỢT HẠN MỨC)
-- -------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER check_customer_debt_before_update
BEFORE UPDATE ON customers
FOR EACH ROW
BEGIN
    IF NEW.current_debt > NEW.credit_limit THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Loi phong thu: Khong the cap nhat! No hien tai da vuot qua han muc tin dung.';
    END IF;
END$$

DELIMITER ;

-- -------------------------------------------------------------------------
-- TRIGGER 4: PHÒNG THỦ BẢNG EMPLOYEES (KIỂM TRA ĐỊNH DẠNG EMAIL)
-- -------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER check_employee_email_before_insert
BEFORE INSERT ON employees
FOR EACH ROW
BEGIN
    IF NEW.email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Loi phong thu: Dinh dang Email cua nhan vien khong hop le!';
    END IF;
END$$

DELIMITER ;

-----5. chặn tồn kho tinh màu âm

DELIMITER $$

CREATE TRIGGER check_colorant_stock_before_insert
BEFORE INSERT ON colorants
FOR EACH ROW
BEGIN
   IF NEW.stock_ml < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Ton kho tinh mau khong duoc am!';
   END IF;
END$$

CREATE TRIGGER check_colorant_stock_before_update
BEFORE UPDATE ON colorants
FOR EACH ROW
BEGIN
   IF NEW.stock_ml < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Ton kho tinh mau khong duoc am!';
   END IF;
END$$

DELIMITER ;


----6. Chặn giá sản phẩm âm

DELIMITER $$

CREATE TRIGGER check_product_price_before_insert
BEFORE INSERT ON productvariants
FOR EACH ROW
BEGIN
   IF NEW.unit_price < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Gia san pham khong duoc am!';
   END IF;
END$$

CREATE TRIGGER check_product_price_before_update
BEFORE UPDATE ON productvariants
FOR EACH ROW
BEGIN
   IF NEW.unit_price < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Gia san pham khong duoc am!';
   END IF;
END$$

DELIMITER ;


----------7. Chặn giá tinh màu âm
DELIMITER $$

CREATE TRIGGER check_colorant_price_before_insert
BEFORE INSERT ON colorants
FOR EACH ROW
BEGIN
   IF NEW.unit_price_per_ml < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Gia tinh mau khong duoc am!';
   END IF;
END$$

CREATE TRIGGER check_colorant_price_before_update
BEFORE UPDATE ON colorants
FOR EACH ROW
BEGIN
   IF NEW.unit_price_per_ml < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Gia tinh mau khong duoc am!';
   END IF;
END$$

DELIMITER ;


----------8. Buộc chiết khấu hãng từ 0 đến 100%


DELIMITER $$

CREATE TRIGGER check_brand_discount_before_insert
BEFORE INSERT ON brands
FOR EACH ROW
BEGIN
   IF NEW.discount_percentage < 0 OR NEW.discount_percentage > 100 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Chiet khau hang phai nam trong khoang 0 den 100!';
   END IF;
END$$

CREATE TRIGGER check_brand_discount_before_update
BEFORE UPDATE ON brands
FOR EACH ROW
BEGIN
   IF NEW.discount_percentage < 0 OR NEW.discount_percentage > 100 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Chiet khau hang phai nam trong khoang 0 den 100!';
   END IF;
END$$

DELIMITER ;


--------9. Chặn lượng tinh màu trong công thức âm

DELIMITER $$

CREATE TRIGGER check_formula_amount_before_insert
BEFORE INSERT ON colorsystem_colorants
FOR EACH ROW
BEGIN
   IF NEW.amount_ml < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Luong tinh mau trong cong thuc khong duoc am!';
   END IF;
END$$

CREATE TRIGGER check_formula_amount_before_update
BEFORE UPDATE ON colorsystem_colorants
FOR EACH ROW
BEGIN
   IF NEW.amount_ml < 0 THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Luong tinh mau trong cong thuc khong duoc am!';
   END IF;
END$$

DELIMITER ;


---------10. Chặn sửa tổng tiền đơn đã giao

DELIMITER $$

CREATE TRIGGER prevent_changing_delivered_order_amount
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
   IF OLD.status = 'đã giao'
      AND NEW.total_amount <> OLD.total_amount THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Khong duoc thay doi tong tien cua don hang da giao!';
   END IF;
END$$

DELIMITER ;


---------11. Chặn xóa đơn đã duyệt hoặc đã giao 


DELIMITER $$

CREATE TRIGGER prevent_delete_confirmed_order
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
   IF OLD.status IN ('đã duyệt', 'đã giao') THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Khong duoc xoa don hang da duyet hoac da giao!';
   END IF;
END$$

DELIMITER ;


---------12. Hệ thống không có ca qua đêm, nên chặn ca kết thúc trước ca bắt đầu

DELIMITER $$

CREATE TRIGGER check_shift_time_before_insert
BEFORE INSERT ON shifts
FOR EACH ROW
BEGIN
   IF NEW.start_time >= NEW.end_time THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Gio bat dau ca lam phai nho hon gio ket thuc!';
   END IF;
END$$

CREATE TRIGGER check_shift_time_before_update
BEFORE UPDATE ON shifts
FOR EACH ROW
BEGIN
   IF NEW.start_time >= NEW.end_time THEN
       SIGNAL SQLSTATE '45000'
       SET MESSAGE_TEXT = 'Loi phong thu: Gio bat dau ca lam phai nho hon gio ket thuc!';
   END IF;
END$$

DELIMITER ;


------view1 hiển thị danh sách khách hàng không lộ passhash

CREATE OR REPLACE VIEW v_customers_safe AS
SELECT
   customer_id,
   name,
   email,
   phone,
   street_address,
   ward_id,
   credit_limit,
   current_debt
FROM customers;

-------view2  hiển thị danh sách nhân viên, không lộ mật khẩu

CREATE OR REPLACE VIEW v_employees_safe AS
SELECT
   employee_id,
   full_name,
   email,
   phone,
   hire_date,
   job_id,
   salary,
   role
FROM employees;



------view3   doanh thu, giá vốn và lợi nhuận theo từng đơn.



CREATE OR REPLACE VIEW v_order_summary AS
SELECT
   o.order_id,
   o.created_at,
   o.status,
   c.customer_id,
   c.name AS customer_name,
   o.total_amount,

   SUM(od.quantity * od.price_at_sale) AS calculated_revenue,
   SUM(od.quantity * od.cost_price_at_sale) AS calculated_cost,
   SUM(od.quantity * (od.price_at_sale - od.cost_price_at_sale)) AS calculated_profit
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN orderdetails od ON o.order_id = od.order_id
GROUP BY
   o.order_id,
   o.created_at,
   o.status,
   c.customer_id,
   c.name,
   o.total_amount;

-----view4 doanh thu theo ngày

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT
   DATE(o.created_at) AS revenue_date,
   COUNT(DISTINCT o.order_id) AS total_orders,
   SUM(od.quantity * od.price_at_sale) AS total_revenue,
   SUM(od.quantity * od.cost_price_at_sale) AS total_cost,
   SUM(od.quantity * (od.price_at_sale - od.cost_price_at_sale)) AS total_profit
FROM orders o
JOIN orderdetails od ON o.order_id = od.order_id
WHERE o.status IN ('đã duyệt', 'đã giao')
GROUP BY DATE(o.created_at);


------view5 khách hàng vượt ngưỡng công nợ


CREATE OR REPLACE VIEW v_customer_debt_status AS
SELECT
   customer_id,
   name,
   email,
   phone,
   credit_limit,
   current_debt,
   credit_limit - current_debt AS remaining_credit,
   CASE
       WHEN current_debt > credit_limit THEN 'VUOT_HAN_MUC'
       WHEN current_debt >= credit_limit * 0.8 THEN 'CANH_BAO'
       ELSE 'BINH_THUONG'
   END AS debt_status
FROM customers;




