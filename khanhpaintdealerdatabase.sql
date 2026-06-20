CREATE DATABASE IF NOT EXISTS `khanhpaintdealerdatabase` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `khanhpaintdealerdatabase`;

SET FOREIGN_KEY_CHECKS = 0;

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
    UNIQUE KEY `uk_brands_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
    `job_id` int NOT NULL AUTO_INCREMENT,
    `job_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `min_salary` decimal(14, 2) DEFAULT NULL,
    `max_salary` decimal(14, 2) DEFAULT NULL,
    PRIMARY KEY (`job_id`),
    UNIQUE KEY `uk_jobs_title` (`job_title`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
    `shift_id` int NOT NULL AUTO_INCREMENT,
    `shift_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `start_time` time NOT NULL,
    `end_time` time NOT NULL,
    PRIMARY KEY (`shift_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `customers` (
    `customer_id` int NOT NULL AUTO_INCREMENT,
    `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
    `address` text COLLATE utf8mb4_unicode_ci,
    `credit_limit` decimal(14, 2) NOT NULL DEFAULT '0.00',
    `current_debt` decimal(14, 2) NOT NULL DEFAULT '0.00',
    PRIMARY KEY (`customer_id`),
    UNIQUE KEY `uk_customers_email` (`email`),
    KEY `idx_customers_phone` (`phone`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `productlines` (
    `line_id` int NOT NULL AUTO_INCREMENT,
    `brand_id` int NOT NULL,
    `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `is_interior` tinyint(1) NOT NULL DEFAULT '0',
    `description` text COLLATE utf8mb4_unicode_ci,
    PRIMARY KEY (`line_id`),
    KEY `idx_productlines_brand_id` (`brand_id`),
    CONSTRAINT `fk_productlines_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `basetypes` (
    `base_id` int NOT NULL AUTO_INCREMENT,
    `line_id` int NOT NULL,
    `base_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `coverage_rate` decimal(8, 2) DEFAULT NULL,
    `drying_time` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `gloss_level` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `recommended_layers` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    PRIMARY KEY (`base_id`),
    KEY `idx_basetypes_line_id` (`line_id`),
    CONSTRAINT `fk_basetypes_line` FOREIGN KEY (`line_id`) REFERENCES `productlines` (`line_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT `fk_employees_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`job_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `productvariants` (
    `variant_id` int NOT NULL AUTO_INCREMENT,
    `base_id` int NOT NULL,
    `volume` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `sku_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `unit_price` decimal(12, 2) NOT NULL,
    `stock_quantity` int NOT NULL DEFAULT '0',
    `warehouse_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    PRIMARY KEY (`variant_id`),
    UNIQUE KEY `uk_productvariants_sku` (`sku_code`),
    KEY `idx_productvariants_base_id` (`base_id`),
    CONSTRAINT `fk_productvariants_base` FOREIGN KEY (`base_id`) REFERENCES `basetypes` (`base_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `colorants` (
    `colorant_id` int NOT NULL AUTO_INCREMENT,
    `colorant_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `stock_ml` decimal(12, 2) NOT NULL DEFAULT '0.00',
    `unit_price_per_ml` decimal(12, 2) NOT NULL DEFAULT '0.00',
    PRIMARY KEY (`colorant_id`),
    UNIQUE KEY `uk_colorants_name` (`colorant_name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `colorsystem` (
    `color_id` int NOT NULL AUTO_INCREMENT,
    `color_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `color_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `base_id` int NOT NULL,
    PRIMARY KEY (`color_id`),
    UNIQUE KEY `uk_colorsystem_code` (`color_code`),
    KEY `idx_colorsystem_base_id` (`base_id`),
    CONSTRAINT `fk_colorsystem_base` FOREIGN KEY (`base_id`) REFERENCES `basetypes` (`base_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `colorsystem_colorants` (
    `color_id` int NOT NULL,
    `colorant_id` int NOT NULL,
    `amount_ml` decimal(12, 2) NOT NULL,
    PRIMARY KEY (`color_id`, `colorant_id`),
    KEY `idx_csc_colorant_id` (`colorant_id`),
    CONSTRAINT `fk_csc_color` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_csc_colorant` FOREIGN KEY (`colorant_id`) REFERENCES `colorants` (`colorant_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `employees_shifts` (
    `employee_id` int NOT NULL,
    `shift_id` int NOT NULL,
    `working_date` date NOT NULL,
    PRIMARY KEY (
        `employee_id`,
        `shift_id`,
        `working_date`
    ),
    KEY `idx_employees_shifts_shift_id` (`shift_id`),
    CONSTRAINT `fk_employees_shifts_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_employees_shifts_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `orders` (
    `order_id` int NOT NULL AUTO_INCREMENT,
    `customer_id` int NOT NULL,
    `sales_rep_id` int DEFAULT NULL,
    `tech_id` int DEFAULT NULL,
    `shift_id` int DEFAULT NULL,
    `order_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_amount` decimal(14, 2) NOT NULL DEFAULT '0.00',
    `status` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
    PRIMARY KEY (`order_id`),
    KEY `idx_orders_customer_id` (`customer_id`),
    KEY `idx_orders_sales_rep_id` (`sales_rep_id`),
    KEY `idx_orders_tech_id` (`tech_id`),
    KEY `idx_orders_shift_id` (`shift_id`),
    CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_sales_rep` FOREIGN KEY (`sales_rep_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_tech` FOREIGN KEY (`tech_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `orderdetails` (
    `order_id` int NOT NULL,
    `variant_id` int NOT NULL,
    `color_id` int NOT NULL,
    `quantity` int NOT NULL DEFAULT '1',
    `price_at_sale` decimal(14, 2) NOT NULL,
    PRIMARY KEY (
        `order_id`,
        `variant_id`,
        `color_id`
    ),
    KEY `idx_orderdetails_variant_id` (`variant_id`),
    KEY `idx_orderdetails_color_id` (`color_id`),
    CONSTRAINT `fk_orderdetails_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_orderdetails_variant` FOREIGN KEY (`variant_id`) REFERENCES `productvariants` (`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_orderdetails_color` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Du lieu mau phuc vu demo cac man hinh truy van, ton kho, cong thuc mau va bao cao.
INSERT INTO `jobs` (`job_title`, `min_salary`, `max_salary`) VALUES
('Quản lý cửa hàng', 12000000, 20000000),
('Nhân viên bán hàng', 7000000, 12000000),
('Kỹ thuật viên pha màu', 8000000, 14000000);

INSERT INTO `shifts` (`shift_name`, `start_time`, `end_time`) VALUES
('Ca sáng', '08:00:00', '12:00:00'),
('Ca chiều', '13:00:00', '17:00:00'),
('Ca tối', '18:00:00', '22:00:00');

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
(1, '5L', 'DUL-IN-A-5L', 720000, 4, 'Kệ A2'),
(2, '5L', 'DUL-IN-C-5L', 760000, 2, 'Kệ A3'),
(3, '18L', 'DUL-EXT-A-18L', 2450000, 7, 'Kệ B1'),
(4, '5L', 'JOT-MAJ-A-5L', 890000, 6, 'Kệ C1'),
(5, '5L', 'KOV-NANO-A-5L', 680000, 0, 'Kệ D1');

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

INSERT INTO `customers` (`name`, `phone`, `email`, `address`, `credit_limit`, `current_debt`) VALUES
('Nguyễn Văn An', '0901000001', 'an.nguyen@example.com', 'Hà Nội', 5000000, 1200000),
('Trần Thị Bình', '0901000002', 'binh.tran@example.com', 'Bắc Ninh', 3000000, 0),
('Lê Minh Cường', '0901000003', 'cuong.le@example.com', 'Hải Phòng', 4000000, 5200000);

INSERT INTO `orders` (`customer_id`, `sales_rep_id`, `tech_id`, `shift_id`, `order_date`, `total_amount`, `status`) VALUES
(1, NULL, NULL, 1, '2026-06-01 09:30:00', 1485000, 'completed'),
(2, NULL, NULL, 2, '2026-06-05 15:10:00', 890000, 'completed'),
(3, NULL, NULL, 1, '2026-06-10 10:45:00', 3210000, 'pending');

INSERT INTO `orderdetails` (`order_id`, `variant_id`, `color_id`, `quantity`, `price_at_sale`) VALUES
(1, 2, 1, 1, 720000),
(1, 3, 3, 1, 765000),
(2, 5, 4, 1, 890000),
(3, 4, 6, 1, 2450000),
(3, 6, 5, 1, 760000);
