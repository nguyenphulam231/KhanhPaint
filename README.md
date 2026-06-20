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
- Tra cứu đơn hàng và xem chi tiết hóa đơn.
- Báo cáo doanh thu, top sản phẩm bán chạy, top mã màu được pha nhiều.

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

File SQL đã có dữ liệu mẫu để demo dashboard, tồn kho, công thức màu, đơn hàng và báo cáo.

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

## Lưu ý

- Không đưa `.env` lên GitHub vì chứa mật khẩu database và JWT secret.
- Không cần nộp `node_modules`, chỉ cần `package.json` và `package-lock.json`.
- Nếu đổi tên database trong `.env`, cần đổi tương ứng trong file SQL hoặc tạo database đúng tên.
