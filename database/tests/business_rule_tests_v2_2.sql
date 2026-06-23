USE `khanhpaintdealerdatabase`;

-- Bộ test này chạy sau:
-- 1) khanhpaintdatabasewithdata.sql
-- 2) database/seed_business_v2.sql
-- 3) database/upgrade_v2.sql
-- 4) database/upgrade_v2_2_compact_erd.sql

-- TC01: Xem catalog lấy tồn kho từ BaseInventory.
SELECT * FROM v_product_catalog LIMIT 10;

-- TC02: Xem công thức màu active có version.
SELECT * FROM v_color_formula_current LIMIT 10;

-- TC03: Tạo đơn hợp lệ bằng stored procedure.
-- Chỉnh variant_id/color_id nếu dữ liệu seed của bạn khác.
CALL sp_create_order(
  1,
  JSON_ARRAY(JSON_OBJECT('variant_id', 1, 'color_id', 1, 'quantity', 1)),
  NULL,
  NULL
);

SET @last_order_id = LAST_INSERT_ID();

-- TC04: Kiểm tra đơn đã trừ tồn kho và ghi log.
SELECT * FROM v_order_trace ORDER BY order_id DESC LIMIT 5;
SELECT * FROM v_inventory_movements ORDER BY movement_id DESC LIMIT 10;

-- TC05: Gán nhân viên/ca làm; dữ liệu demo cần có employees_shifts đúng ngày tạo đơn.
-- CALL sp_assign_order_staff(@last_order_id, 2, 2, 1);

-- TC06: Complete đơn, kiểm tra công nợ.
-- CALL sp_complete_order(@last_order_id);
-- SELECT * FROM v_customer_debt;

-- TC07: Ghi nhận thanh toán.
-- CALL sp_record_payment(@last_order_id, 100000, 'cash', 'Test payment');

-- TC08: Hủy đơn chưa thanh toán, kiểm tra hoàn kho đúng một lần.
-- CALL sp_cancel_order(@last_order_id);
-- SELECT * FROM v_inventory_movements WHERE order_id = @last_order_id ORDER BY movement_id;

-- TC09: Case lỗi - màu sai base hoặc thiếu tinh màu sẽ bị trigger/procedure chặn.
-- CALL sp_create_order(1, JSON_ARRAY(JSON_OBJECT('variant_id', 1, 'color_id', 4, 'quantity', 999999)), NULL, NULL);
