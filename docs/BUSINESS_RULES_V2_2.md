
## Các thay đổi chính

| Mã | Luật nghiệp vụ | Cài đặt |
|---|---|---|
| BR-01 | Tồn kho sơn gốc tách khỏi danh mục sản phẩm | `baseinventory` |
| BR-02 | Mỗi mã màu có công thức active và có version | `colorsystem_colorants.formula_version`, `is_active`, `effective_from`, `effective_to` |
| BR-03 | Đơn hàng lưu lại công thức version đã dùng | `orderdetails.formula_version` |
| BR-04 | Mỗi dòng đơn có trạng thái pha và QC | `orderdetails.mix_status`, `qc_status`, `mixed_at`, `qc_note` |
| BR-05 | Không được bán nếu thiếu sơn gốc | `sp_create_order` + trigger + row lock |
| BR-06 | Không được bán nếu thiếu tinh màu | `sp_create_order` + trigger + row lock |
| BR-07 | Màu phải tương thích với base sản phẩm | `sp_create_order` + trigger |
| BR-08 | Tạo đơn phải là transaction nguyên tử | `sp_create_order` |
| BR-09 | Hủy đơn phải hoàn kho đúng một lần | `trg_orders_bu_business_rules` |
| BR-10 | Thanh toán không vượt tổng tiền đơn | `trg_payments_bi_validate` + `sp_record_payment` |
| BR-11 | Complete đơn kiểm tra nhân viên, ca làm, công nợ | `trg_orders_bu_business_rules` + `sp_complete_order` |
| BR-12 | Gán sales/tech phải đúng vai trò và đúng ca | `sp_assign_order_staff` + trigger |
| BR-13 | Mọi biến động kho phải có log | `inventory_movements` |
| BR-14 | Dữ liệu báo cáo/truy vết lấy qua view | `v_order_trace`, `v_color_formula_current`, `v_low_stock_alert`, `v_daily_revenue` |

## Stored procedures chính

- `sp_create_order(customer_id, items_json, street_address, ward_id)`
- `sp_assign_order_staff(order_id, sales_rep_id, tech_id, shift_id)`
- `sp_complete_order(order_id)`
- `sp_cancel_order(order_id)`
- `sp_record_payment(order_id, amount, payment_method, note)`
- `sp_adjust_inventory(inventory_type, item_id, quantity_delta, note)`

