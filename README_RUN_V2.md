
## 1. Thứ tự chạy database

Mở MySQL Workbench hoặc terminal MySQL, chạy theo thứ tự:

```sql
SOURCE khanhpaintdatabasewithdata.sql;
SOURCE database/upgrade_v2.sql;
SOURCE database/upgrade_v2_2_compact_erd.sql;
SOURCE database/seed_business_v2.sql;
```

Ghi chú:

- `upgrade_v2.sql` tạo nền V2.1: trigger, payment, công nợ, inventory movements.
- `upgrade_v2_2_compact_erd.sql` nâng cấp ERD gọn: `baseinventory`, formula version, mix/QC status, stored procedures, view và index.
- `seed_business_v2.sql` có thể chạy sau V2.2 vì V2.2 đã có trigger tự tạo `baseinventory` khi thêm `productvariants`.

Nếu database đã có dữ liệu từ bản cũ, vẫn chạy được theo dạng migration bổ sung. Nếu cần dựng sạch nhất, drop database rồi chạy lại đúng thứ tự trên.

## 2. Chuẩn bị biến môi trường

Copy `.env.example` thành `.env`, rồi sửa thông tin MySQL:

```bash
cp .env.example .env
```

Ví dụ:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=khanhpaintdealerdatabase
JWT_SECRET=change_this_to_a_long_random_secret
PORT=3000
```

## 3. Chạy server

```bash
npm install
npm run dev
```

hoặc:

```bash
npm start
```

Mở trình duyệt:

- Client: http://localhost:3000/client
- Admin: http://localhost:3000/admin/login

## 4. Điểm nâng cấp chính trong V2.2

### 4.1. Tách BaseInventory đúng theo ERD

Tồn kho sơn gốc không còn lấy trực tiếp từ `productvariants.stock_quantity` làm nguồn chính. V2.2 thêm bảng:

```sql
baseinventory(variant_id, stock_quantity, warehouse_location, reorder_level)
```

Ý nghĩa:

- `productvariants` là danh mục bán hàng: SKU, dung tích, giá, base.
- `baseinventory` là số lượng tồn kho thực tế.

Route admin/product và view catalog đã được chỉnh để đọc tồn kho từ `baseinventory`.

### 4.2. Version hóa công thức nhưng không thêm bảng mới

Không thêm `color_formulas` / `color_formula_details` để tránh rối ERD. Thay vào đó, mở rộng bảng quan hệ N-N hiện có:

```sql
colorsystem_colorants(
  color_id,
  colorant_id,
  amount_ml,
  formula_version,
  effective_from,
  effective_to,
  is_active
)
```

Khi cập nhật công thức màu, hệ thống không xóa công thức cũ mà tạo `formula_version` mới. `orderdetails` lưu `formula_version` đã dùng để hóa đơn cũ vẫn truy vết đúng công thức pha.

### 4.3. Trạng thái pha và QC nằm trên OrderDetails

Không thêm bảng `mixing_jobs`. Mỗi dòng `orderdetails` được bổ sung:

```sql
formula_version,
mix_status,
qc_status,
mixed_at,
qc_note
```

Điều này hợp lý vì mỗi dòng đơn hàng tương ứng với một sản phẩm/màu cần pha.

### 4.4. Stored procedures cho nghiệp vụ chính

Backend đã được chỉnh để gọi stored procedure thay vì tự thao tác rời rạc:

```sql
sp_create_order
sp_assign_order_staff
sp_complete_order
sp_cancel_order
sp_record_payment
sp_adjust_inventory
```

Trong đó `sp_create_order` dùng transaction và khóa tồn kho bằng `FOR UPDATE` / row lock trước khi insert orderdetails. Trigger vẫn là lớp bảo vệ cuối cùng.

### 4.5. Tồn kho kép và audit kho

Khi tạo đơn, hệ thống trừ đồng thời:

- `baseinventory.stock_quantity` cho sơn gốc.
- `colorants.stock_ml` cho tinh màu.

Mọi biến động được ghi vào `inventory_movements`, gồm tồn trước, tồn sau, loại biến động, SKU/tinh màu và mã đơn liên quan.

### 4.6. View báo cáo/truy vết

Các view quan trọng:

```sql
v_product_catalog
v_color_formula
v_color_formula_current
v_order_trace
v_inventory_movements
v_low_stock_alert
v_daily_revenue
v_employee_performance
v_customer_debt
```

Đặc biệt, `v_order_trace` dùng để demo truy vết 360 độ: khách hàng, sản phẩm, base, mã màu, formula version, sales, tech, ca làm, trạng thái pha và trạng thái thanh toán.

## 5. Luồng demo nên trình bày

1. Client tạo đơn với sản phẩm và màu tương thích base.
2. Backend gọi `sp_create_order`.
3. Procedure khóa dòng tồn kho, kiểm tra sơn gốc, tinh màu và công thức active.
4. Trigger insert `orderdetails` trừ `baseinventory` và `colorants`.
5. Hệ thống ghi `inventory_movements`.
6. Admin gán sales/tech/shift bằng `sp_assign_order_staff`.
7. Admin complete đơn bằng `sp_complete_order`; hệ thống kiểm tra phân ca và công nợ.
8. Admin ghi nhận thanh toán bằng `sp_record_payment`.
9. Admin hủy một đơn chưa thanh toán bằng `sp_cancel_order` để demo hoàn kho đúng một lần.
10. Mở `v_order_trace`, `v_inventory_movements`, `v_low_stock_alert` để demo truy vết và báo cáo.

## 6. Test SQL

Có file test gợi ý:

```sql
SOURCE database/tests/business_rule_tests_v2_2.sql;
```

Nên đọc file trước khi chạy vì một số test cần chỉnh `variant_id`, `color_id` hoặc bỏ comment tùy dữ liệu demo trên máy.

## 7. Tài liệu nghiệp vụ

Xem thêm:

```text
docs/BUSINESS_RULES_V2_2.md
```

File này liệt kê business rules và nơi cài đặt: constraint, trigger, procedure, view.
