# KhanhPaint V2.1 - Hướng dẫn chạy và các điểm đã nâng cấp

## 1. Chuẩn bị database

1. Mở MySQL Workbench hoặc terminal MySQL.
2. Chạy file dữ liệu nền:

```sql
SOURCE khanhpaintdatabasewithdata.sql;
```

3. Chạy migration nghiệp vụ. File này đã được sửa để **idempotent**, tức là có thể chạy lại nhiều lần mà không lỗi trùng constraint/index/column:

```sql
SOURCE database/upgrade_v2.sql;
```

4. Chạy seed dữ liệu nghiệp vụ để có sản phẩm, SKU, mã màu, công thức demo, nhân sự bán hàng/kỹ thuật và phân ca mẫu:

```sql
SOURCE database/seed_business_v2.sql;
```

## 2. Chuẩn bị biến môi trường

Copy `.env.example` thành `.env`, rồi sửa mật khẩu MySQL:

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

## 4. Tài khoản admin có sẵn

Theo dữ liệu hiện tại, tài khoản admin mẫu là:

- Email: `admin@khanhpaint.com`
- Mật khẩu: dùng mật khẩu đã hash trong dữ liệu nhóm đã nhập trước đó.

Nếu không đăng nhập được, hãy tạo lại nhân viên admin bằng trang quản trị hoặc cập nhật `password_hash` bằng bcrypt.

## 5. Các nâng cấp mới trong V2.1

### 5.1. Hoàn kho khi hủy đơn

Khi admin đổi `orders.status` sang `cancelled`, trigger `trg_orders_bu_business_rules` tự động:

- hoàn lại `productvariants.stock_quantity`,
- hoàn lại `colorants.stock_ml` theo công thức màu,
- ghi log vào `inventory_movements`,
- đánh dấu `orders.inventory_restored = 1`,
- chặn mở lại đơn đã hủy để tránh sai lệch tồn kho.

### 5.2. Thêm thời gian tạo/cập nhật đơn

Bảng `orders` được bổ sung:

- `created_at`,
- `updated_at`,
- `cancelled_at`,
- `inventory_restored`.

Các màn hình admin/client đã hiển thị thêm thời gian tạo đơn.

### 5.3. Kiểm soát vai trò nhân viên khi gán đơn

Endpoint `PATCH /api/admin/orders/:id/assign` và trigger database cùng kiểm tra:

- `sales_rep_id` phải là nhân viên có job liên quan đến Bán hàng hoặc admin,
- `tech_id` phải là Kỹ thuật viên/Pha màu hoặc admin.

Khi chuyển đơn sang `completed`, hệ thống bắt buộc phải có đủ nhân viên bán hàng, kỹ thuật viên và ca làm.

### 5.4. Kiểm tra nhân viên có thuộc ca làm hay không

Khi gán `shift_id`, hệ thống kiểm tra bảng `employees_shifts` theo đúng ngày tạo đơn `DATE(orders.created_at)`. Nếu nhân viên chưa được phân vào ca đó, API sẽ báo lỗi.

### 5.5. Nhật ký biến động kho

Thêm bảng `inventory_movements` và view `v_inventory_movements`. Mọi biến động do trigger tạo ra đều lưu:

- loại kho: `base` hoặc `colorant`,
- mã đơn liên quan,
- SKU hoặc tinh màu,
- số lượng biến động,
- tồn trước và tồn sau,
- loại nghiệp vụ: thêm/sửa/xóa chi tiết đơn, hủy đơn hoàn kho.

Trang mới:

- Admin: http://localhost:3000/admin/inventory-movements.html

### 5.6. Migration chạy lại an toàn

`database/upgrade_v2.sql` đã dùng các stored procedure tạm:

- `sp_add_column_if_not_exists`,
- `sp_add_unique_if_not_exists`,
- `sp_add_check_if_not_exists`,
- `sp_add_index_if_not_exists`.

Vì vậy chạy lại migration không còn bị lỗi `Duplicate key name` hoặc constraint đã tồn tại.

### 5.7. Công nợ và thanh toán

Bổ sung:

- bảng `payments`,
- cột `orders.paid_amount`,
- cột `orders.payment_status`,
- view `v_customer_debt`,
- API ghi nhận thanh toán: `POST /api/admin/orders/:id/payments`.

Khi đơn chuyển sang `completed`, hệ thống tự cộng phần chưa thanh toán vào `customers.current_debt` và kiểm tra `credit_limit`. Khi ghi nhận payment, trigger tự giảm công nợ khách hàng.

## 6. Luồng demo nên trình bày

1. Client tạo đơn từ sản phẩm + màu tương thích base.
2. Transaction tạo `orders` và `orderdetails`.
3. Trigger kiểm tra tồn kho sơn gốc, tinh màu và base/màu.
4. Trigger trừ kho và ghi `inventory_movements`.
5. Admin phân nhân viên bán hàng, kỹ thuật viên và ca làm.
6. Admin chuyển đơn sang `completed`; hệ thống kiểm tra phân ca và cập nhật công nợ.
7. Admin ghi nhận thanh toán; hệ thống giảm công nợ.
8. Admin hủy một đơn chưa thanh toán để demo trigger hoàn kho.

## 7. Lưu ý khi demo phân ca

Nếu khi hoàn tất đơn hoặc gán ca gặp lỗi “nhân viên chưa được phân vào ca làm của ngày tạo đơn”, hãy vào:

- Admin → Phân ca làm việc

Sau đó gán nhân viên bán hàng và kỹ thuật viên vào đúng ca, đúng ngày tạo đơn.
