# KhanhPaint Management Database System

Project demo quản lý đại lý sơn KhanhPaint bằng Node.js, Express và MySQL.

## Chức năng chính

- Đăng nhập admin/client bằng JWT.
- Quản lý danh mục sản phẩm theo cây: Brand -> ProductLine -> BaseType -> ProductVariant.
- Dashboard admin có thống kê nhanh và cảnh báo tồn kho.
- Tra cứu tồn kho kép:
  - Sơn gốc theo số lượng lon/thùng.
  - Tinh màu theo ml.
- Tra cứu mã màu và công thức pha màu theo lượng tinh màu.
- Tra cứu khách hàng, công nợ và lịch sử mua hàng.
- Tra cứu đơn hàng, xem chi tiết hóa đơn và log tồn kho.
- Tạo đơn hàng mới bằng transaction.
- Trigger trong database tự động:
  - Kiểm tra base của mã màu có tương thích với sản phẩm hay không.
  - Kiểm tra tồn kho sơn gốc và tinh màu.
  - Trừ tồn kho ProductVariants.
  - Trừ stock_ml của Colorants theo công thức.
  - Tính total_amount của Orders.
  - Cập nhật current_debt khi bán công nợ.
  - Ghi inventory_logs để truy vết biến động kho.
- Báo cáo doanh thu, top sản phẩm bán chạy, top mã màu được pha nhiều.

## Kỹ thuật database đã dùng

- Primary Key, Foreign Key.
- Quan hệ 1-N và N-N.
- Bảng trung gian: `orderdetails`, `colorsystem_colorants`, `employees_shifts`.
- CHECK constraint cho số lượng, giá tiền, công nợ, role, trạng thái đơn hàng.
- UNIQUE constraint cho email, SKU, mã màu, tên brand.
- INDEX cho các khóa ngoại và trường tìm kiếm.
- VIEW: `v_product_inventory`, `v_order_summary`.
- TRIGGER: tự động xử lý tồn kho kép và log giao dịch.
- TRANSACTION trong API tạo đơn hàng.

## Cài đặt

```bash
npm install
```

Tạo file cấu hình:

```powershell
Copy-Item .env.example .env
```

Sửa file `.env` theo máy của bạn:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=khanhpaintdealerdatabase
JWT_SECRET=khanhpaint_secret_key_2026_at_least_32_chars
JWT_EXPIRES_IN=2h
```

## Import database

Nếu dùng PowerShell và XAMPP:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -p
```

Sau khi vào `mysql>`:

```sql
source C:/Users/LENOVO/OneDrive/Desktop/dtb/prj/KhanhPaint/khanhpaintdealerdatabase.sql
```

Hoặc dùng MySQL Workbench: mở file `khanhpaintdealerdatabase.sql` rồi chạy toàn bộ script.

File SQL đã có dữ liệu mẫu để demo dashboard, tồn kho, công thức màu, đơn hàng, trigger, log kho và báo cáo.

## Tạo admin đầu tiên

```bash
npm run create-admin
```

## Chạy server

```bash
npm start
```

Mở trình duyệt:

```text
http://localhost:3000
```

Trang admin:

```text
http://localhost:3000/admin/login.html
```

## Luồng demo đề xuất

1. Đăng nhập admin.
2. Mở Dashboard để xem tổng quan.
3. Vào Tồn kho kép để xem tồn sơn gốc và tinh màu.
4. Vào Công thức màu để tra cứu mã màu.
5. Vào Đơn hàng để tạo đơn hàng mới.
6. Mở chi tiết đơn hàng để xem tổng tiền, dòng hàng và log tồn kho do trigger sinh ra.
7. Quay lại Tồn kho để thấy số lượng đã bị trừ.
8. Vào Khách hàng & công nợ để xem công nợ nếu đơn hàng thanh toán bằng debt.

## Lưu ý

- Không đưa `.env` lên GitHub vì chứa mật khẩu database và JWT secret.
- Không cần nộp `node_modules`, chỉ cần `package.json` và `package-lock.json`.
- Nếu đổi tên database trong `.env`, cần đổi tương ứng trong file SQL hoặc tạo database đúng tên.
