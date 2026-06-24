USE `khanhpaintdealerdatabase`;

-- Dữ liệu nghiệp vụ bổ sung để demo luồng catalog -> chọn màu -> tạo đơn -> trigger trừ kho.
-- Nên chạy SAU database/upgrade_v2.sql để có UNIQUE KEY phục vụ INSERT IGNORE.

INSERT IGNORE INTO brands (name, origin, description) VALUES
('Dulux', 'Anh Quốc', 'Thương hiệu sơn trang trí phổ biến, mạnh về sơn nội thất và ngoại thất.'),
('Nippon', 'Nhật Bản', 'Thương hiệu sơn có dải sản phẩm phong phú cho nhà dân dụng.'),
('Kova', 'Việt Nam', 'Thương hiệu sơn và chống thấm nội địa.'),
('Maxilite', 'Anh Quốc', 'Dòng sơn kinh tế, phù hợp công trình dân dụng.'),
('Mykolor', 'Việt Nam', 'Thương hiệu mạnh về màu sắc trang trí.'),
('Jotun', 'Na Uy', 'Jotun nổi tiếng với hệ thống pha màu vi tính đa dạng.');

INSERT IGNORE INTO basetypes (base_name, description) VALUES
('Base A', 'Sơn gốc cho màu trắng và màu rất nhạt.'),
('Base B', 'Sơn gốc cho nhóm màu trung tính và màu sáng vừa.'),
('Base C', 'Sơn gốc cho nhóm màu đậm, độ bão hòa cao.'),
('Clear Base', 'Base trong, hỗ trợ màu hiệu ứng hoặc màu đậm đặc biệt.'),
('White Base', 'Base trắng dùng trực tiếp hoặc pha màu pastel.');

INSERT IGNORE INTO productlines (brand_id, name, is_interior, coverage_rate, drying_time, gloss_level, recommended_layers, description)
SELECT brand_id, 'EasyClean Nội Thất', 1, 12.00, '2 giờ', 'Mịn', '2', 'Sơn nội thất dễ lau chùi.' FROM brands WHERE name = 'Dulux';

INSERT IGNORE INTO productlines (brand_id, name, is_interior, coverage_rate, drying_time, gloss_level, recommended_layers, description)
SELECT brand_id, 'Weathershield Ngoại Thất', 0, 10.50, '3 giờ', 'Bóng nhẹ', '2', 'Sơn ngoại thất chống chịu thời tiết.' FROM brands WHERE name = 'Dulux';

INSERT IGNORE INTO productlines (brand_id, name, is_interior, coverage_rate, drying_time, gloss_level, recommended_layers, description)
SELECT brand_id, 'Odour-less Nội Thất', 1, 11.00, '2 giờ', 'Mờ', '2', 'Sơn nội thất ít mùi.' FROM brands WHERE name = 'Nippon';

INSERT IGNORE INTO productlines (brand_id, name, is_interior, coverage_rate, drying_time, gloss_level, recommended_layers, description)
SELECT brand_id, 'Chống Thấm CT-11A', 0, 7.00, '4 giờ', 'Mờ', '2', 'Sơn chống thấm ngoài trời.' FROM brands WHERE name = 'Kova';

INSERT IGNORE INTO productvariants (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
SELECT pl.line_id, bt.base_id, '1L', CONCAT('DX-EC-', REPLACE(bt.base_name, ' ', ''), '-1L'), 120000, 40, 'Kệ A1'
FROM productlines pl JOIN brands br ON pl.brand_id = br.brand_id JOIN basetypes bt ON bt.base_name IN ('Base A', 'Base B')
WHERE br.name = 'Dulux' AND pl.name = 'EasyClean Nội Thất';

INSERT IGNORE INTO productvariants (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
SELECT pl.line_id, bt.base_id, '5L', CONCAT('DX-EC-', REPLACE(bt.base_name, ' ', ''), '-5L'), 520000, 25, 'Kệ A2'
FROM productlines pl JOIN brands br ON pl.brand_id = br.brand_id JOIN basetypes bt ON bt.base_name IN ('Base A', 'Base B')
WHERE br.name = 'Dulux' AND pl.name = 'EasyClean Nội Thất';

INSERT IGNORE INTO productvariants (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
SELECT pl.line_id, bt.base_id, '18L', CONCAT('DX-WS-', REPLACE(bt.base_name, ' ', ''), '-18L'), 1850000, 18, 'Kho B1'
FROM productlines pl JOIN brands br ON pl.brand_id = br.brand_id JOIN basetypes bt ON bt.base_name IN ('Base B', 'Base C')
WHERE br.name = 'Dulux' AND pl.name = 'Weathershield Ngoại Thất';

INSERT IGNORE INTO productvariants (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
SELECT pl.line_id, bt.base_id, '5L', CONCAT('NP-OD-', REPLACE(bt.base_name, ' ', ''), '-5L'), 460000, 30, 'Kệ C1'
FROM productlines pl JOIN brands br ON pl.brand_id = br.brand_id JOIN basetypes bt ON bt.base_name IN ('Base A', 'Base B')
WHERE br.name = 'Nippon' AND pl.name = 'Odour-less Nội Thất';

INSERT IGNORE INTO productvariants (line_id, base_id, volume, sku_code, unit_price, stock_quantity, warehouse_location)
SELECT pl.line_id, bt.base_id, '4KG', CONCAT('KV-CT-', REPLACE(bt.base_name, ' ', ''), '-4KG'), 350000, 20, 'Kho CT'
FROM productlines pl JOIN brands br ON pl.brand_id = br.brand_id JOIN basetypes bt ON bt.base_name IN ('White Base')
WHERE br.name = 'Kova' AND pl.name = 'Chống Thấm CT-11A';

INSERT IGNORE INTO colorants (colorant_name, stock_ml, unit_price_per_ml) VALUES
('Đen', 20000, 200),
('Đỏ Oxide', 15000, 220),
('Vàng Oxide', 16000, 210),
('Xanh Dương', 12000, 250),
('Xanh Lá', 12000, 240),
('Trắng Titan', 18000, 180);

INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'PA-101', 'Trắng ngọc trai', base_id FROM basetypes WHERE base_name = 'Base A';
INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'PA-102', 'Kem sữa', base_id FROM basetypes WHERE base_name = 'Base A';
INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'PB-201', 'Be cát', base_id FROM basetypes WHERE base_name = 'Base B';
INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'PB-202', 'Ghi khói', base_id FROM basetypes WHERE base_name = 'Base B';
INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'PC-301', 'Xanh đại dương', base_id FROM basetypes WHERE base_name = 'Base C';
INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'PC-302', 'Đỏ đất', base_id FROM basetypes WHERE base_name = 'Base C';
INSERT IGNORE INTO colorsystem (color_code, color_name, base_id)
SELECT 'WB-401', 'Trắng phủ chống thấm', base_id FROM basetypes WHERE base_name = 'White Base';

INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 12 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Trắng Titan' WHERE cs.color_code = 'PA-101';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 6 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Vàng Oxide' WHERE cs.color_code = 'PA-102';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 14 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Vàng Oxide' WHERE cs.color_code = 'PB-201';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 4 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Đỏ Oxide' WHERE cs.color_code = 'PB-201';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 18 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Đen' WHERE cs.color_code = 'PB-202';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 42 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Xanh Dương' WHERE cs.color_code = 'PC-301';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 8 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Xanh Lá' WHERE cs.color_code = 'PC-301';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 35 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Đỏ Oxide' WHERE cs.color_code = 'PC-302';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 5 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Đen' WHERE cs.color_code = 'PC-302';
INSERT IGNORE INTO colorsystem_colorants (color_id, colorant_id, amount_ml)
SELECT cs.color_id, c.colorant_id, 20 FROM colorsystem cs JOIN colorants c ON c.colorant_name = 'Trắng Titan' WHERE cs.color_code = 'WB-401';

-- Bổ sung nhân sự vận hành để demo đúng ERD Employees - Jobs - Shifts.
INSERT IGNORE INTO jobs (job_title, min_salary, max_salary) VALUES
('Kỹ thuật viên pha màu', 7000000, 18000000),
('Quản lý cửa hàng', 12000000, 30000000);

INSERT IGNORE INTO shifts (shift_name, start_time, end_time) VALUES
('Ca chiều', '13:00:00', '17:00:00'),
('Ca tối', '18:00:00', '22:00:00');

INSERT IGNORE INTO employees (full_name, email, phone, hire_date, password_hash, job_id, role)
SELECT 'Nguyễn Sale Demo', 'sale.demo@khanhpaint.com', '0901000001', CURDATE(), NULL, job_id, 'staff'
FROM jobs WHERE job_title = 'Bán hàng';

INSERT IGNORE INTO employees (full_name, email, phone, hire_date, password_hash, job_id, role)
SELECT 'Lê Kỹ Thuật Demo', 'tech.demo@khanhpaint.com', '0901000002', CURDATE(), NULL, job_id, 'staff'
FROM jobs WHERE job_title = 'Kỹ thuật viên pha màu';

INSERT IGNORE INTO employees_shifts (employee_id, shift_id, working_date)
SELECT e.employee_id, s.shift_id, CURDATE()
FROM employees e
JOIN shifts s ON s.shift_name IN ('Ca sáng', 'Ca chiều', 'Ca tối')
WHERE e.email IN ('sale.demo@khanhpaint.com', 'tech.demo@khanhpaint.com');

INSERT IGNORE INTO employees_shifts (employee_id, shift_id, working_date)
SELECT e.employee_id, s.shift_id, DATE_ADD(CURDATE(), INTERVAL 1 DAY)
FROM employees e
JOIN shifts s ON s.shift_name IN ('Ca sáng', 'Ca chiều', 'Ca tối')
WHERE e.email IN ('sale.demo@khanhpaint.com', 'tech.demo@khanhpaint.com');
