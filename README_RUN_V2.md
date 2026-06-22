# KhanhPaint V2 - Hướng dẫn chạy và điểm đã nâng cấp

## 1. Chuẩn bị database

1. Mở MySQL Workbench hoặc terminal MySQL.
2. Chạy file dữ liệu nền:

```sql
SOURCE khanhpaintdatabasewithdata.sql;
```

3. Chạy migration nghiệp vụ mới:

```sql
SOURCE database/upgrade_v2.sql;
```

4. Chạy seed dữ liệu nghiệp vụ để có sản phẩm, SKU, mã màu và công thức demo:

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

## 5. Nội dung nâng cấp chính

- Tách token admin và customer: `adminToken` / `customerToken`.
- Bỏ hard-code DB password và JWT secret, chuyển sang `.env`.
- Thêm API client xem sản phẩm, lọc sản phẩm, lấy màu theo base và tạo đơn hàng.
- Thêm API admin quản lý đơn hàng, xem chi tiết, cập nhật trạng thái.
- Thêm trang client `/client/products.html` và `/client/order-history.html`.
- Thêm trang admin `/admin/order-manage.html`.
- Thêm trigger kiểm tra tương thích base/màu, kiểm tra tồn kho, trừ tồn kho sơn gốc, trừ tồn kho tinh màu và cập nhật tổng tiền đơn hàng.
- Thêm view báo cáo: `v_product_catalog`, `v_color_formula`, `v_order_trace`.
