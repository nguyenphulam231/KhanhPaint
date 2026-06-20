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