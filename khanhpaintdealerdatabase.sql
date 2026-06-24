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
  PRIMARY KEY (`order_id`,`variant_id`,`color_id`),
  KEY `variant_id` (`variant_id`),
  KEY `color_id` (`color_id`),
  CONSTRAINT `orderdetails_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orderdetails_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `productvariants` (`variant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orderdetails_ibfk_3` FOREIGN KEY (`color_id`) REFERENCES `colorsystem` (`color_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;