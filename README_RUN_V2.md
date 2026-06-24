# KhanhPaint V2 - Bản cải tiến theo ERD mới, không tạo thêm bảng

Bản này giữ nguyên bộ thực thể trong ERD nhóm, không bổ sung bảng mới. Các nâng cấp được thực hiện bằng cách thêm thuộc tính, ràng buộc, trigger, view, API và giao diện quản trị.

## 1. Chuẩn bị database

Mở MySQL Workbench hoặc terminal MySQL, sau đó chạy theo đúng thứ tự:

```sql
SOURCE khanhpaintdatabasewithdata.sql;
SOURCE database/upgrade_v2.sql;
SOURCE database/seed_business_v2.sql;
```

Ghi chú:

- `khanhpaintdatabasewithdata.sql` đã được thêm `SET FOREIGN_KEY_CHECKS = 0/1` để tránh lỗi khóa ngoại do file nền tạo bảng chưa đúng thứ tự.
- `database/upgrade_v2.sql` là migration chính. File này không tạo bảng mới; chỉ thêm `orders.created_at`, unique/check/index, view và trigger.
- `database/seed_business_v2.sql` bổ sung dữ liệu demo cho SKU, công thức màu, nhân viên bán hàng, kỹ thuật viên và phân ca trong ngày hiện tại để test luồng đơn hàng.

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

Nếu không đăng nhập được, hãy cập nhật lại `password_hash` của admin bằng bcrypt hoặc tạo admin mới trực tiếp trong database.

## 5. Nội dung nâng cấp chính

### Database

- Thêm `orders.created_at` để truy vết ngày tạo đơn và kiểm tra ca làm theo đúng ngày.
- Thêm unique/check/index bằng migration idempotent hơn, hạn chế lỗi khi chạy lại.
- Sửa trigger `orderdetails`:
  - kiểm tra số lượng dương;
  - kiểm tra tồn kho sơn gốc;
  - kiểm tra màu tương thích với base;
  - bắt buộc mã màu phải có công thức pha;
  - kiểm tra và trừ tồn kho tinh màu;
  - cập nhật `orders.total_amount` tự động.
- Thêm trigger `orders`:
  - kiểm soát luồng trạng thái `pending -> confirmed -> mixing -> completed`;
  - hủy đơn thì tự hoàn kho sơn gốc và tinh màu;
  - không cho mở lại đơn đã hủy để tránh sai tồn kho;
  - không cho chuyển ngược đơn đã hoàn tất;
  - kiểm tra `sales_rep_id` phải là nhân viên bán hàng/admin;
  - kiểm tra `tech_id` phải là kỹ thuật viên pha màu/admin;
  - kiểm tra nhân viên phải được phân vào đúng ca của ngày tạo đơn.
- Mở rộng view:
  - `v_product_catalog`;
  - `v_color_formula`;
  - `v_order_trace`.
- Bổ sung trigger bảo vệ lịch sử nghiệp vụ:
  - không cho sửa/xóa công thức màu đã dùng trong đơn chưa hủy;
  - không cho đổi base của mã màu đã phát sinh giao dịch;
  - không cho đổi base/dòng sản phẩm của SKU đã có đơn chưa hủy.

### Backend/API

- API cập nhật trạng thái đơn hàng chạy trong transaction và trả lỗi nghiệp vụ rõ hơn.
- API gán nhân viên/ca làm kiểm tra job và lịch phân ca trước khi update.
- Giữ lại API quản lý khách hàng của code nền mới.
- API dashboard trả thêm:
  - doanh thu đơn hoàn tất;
  - giá trị đơn đang xử lý;
  - thống kê trạng thái đơn;
  - cảnh báo sơn gốc sắp hết;
  - cảnh báo tinh màu sắp hết;
  - đơn hàng mới gần đây.

### Giao diện

- Dashboard admin có thêm bảng trạng thái đơn, đơn gần đây và cảnh báo tồn kho.
- Trang quản lý đơn hàng có thêm ngày tạo đơn, form gán nhân viên bán hàng/kỹ thuật viên/ca làm.
- Giữ trang quản lý khách hàng theo địa chỉ Tỉnh/Phường của ERD mới.
- Khi hủy đơn từ admin, hệ thống báo rõ đã hoàn kho.
- Client không cho đặt nhanh vượt quá tồn kho sơn gốc đang hiển thị.

## 6. Luồng demo nên trình bày

1. Client chọn ProductVariant và ColorSystem tương thích theo base.
2. Client tạo đơn, trigger tự trừ tồn kho sơn gốc và tinh màu.
3. Admin phân công sales, tech và shift.
4. Admin chuyển trạng thái: `pending -> confirmed -> mixing -> completed`.
5. Nếu admin chuyển sang `cancelled`, trigger tự hoàn kho và khóa đơn đã hủy.
6. Admin mở dashboard để xem tồn kho và truy vết đơn hàng.
