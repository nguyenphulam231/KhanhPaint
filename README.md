# KhanhPaint Management Database System

Project demo quản lý đại lý sơn KhanhPaint bằng Node.js, Express và MySQL.

## Chức năng chính

### Admin

- Đăng nhập admin bằng JWT.
- Quản lý danh mục sản phẩm theo cây: Brand -> ProductLine -> BaseType -> ProductVariant.
- Dashboard admin có thống kê nhanh và cảnh báo tồn kho.
- Tra cứu tồn kho kép:
  - Sơn gốc theo số lượng lon/thùng.
  - Tinh màu theo ml.
- Tra cứu mã màu và công thức pha màu theo lượng tinh màu.
- Tạo đơn hàng mới bằng transaction.
- Tra cứu đơn hàng, xem chi tiết hóa đơn và log tồn kho.
- Quản lý khách hàng, hạn mức công nợ, hạn trả, đơn quá hạn và phiếu thu công nợ.
- Báo cáo doanh thu, top sản phẩm bán chạy, top mã màu được pha nhiều.

### Khách hàng

- Đăng ký, đăng nhập tài khoản khách hàng.
- Xem danh mục sản phẩm, giá bán, tồn kho, base và số mã màu tương thích.
- Chọn sản phẩm + mã màu tương thích, thêm vào giỏ yêu cầu.
- Gửi yêu cầu đặt hàng từ giao diện khách hàng. Đơn khách gửi được lưu `status = 'pending'` và hệ thống giữ tồn kho.
- Xem lịch sử mua hàng và chi tiết mã màu đã pha.
- Mua lại màu cũ từ lịch sử đơn hàng.
- Xem hồ sơ cá nhân, hạn mức công nợ, công nợ hiện tại, hạn trả gần nhất, đơn quá hạn và lịch sử thanh toán.

## Kỹ thuật database đã dùng

- Primary Key, Foreign Key.
- Quan hệ 1-N và N-N.
- Bảng trung gian: `orderdetails`, `colorsystem_colorants`, `employees_shifts`.
- Bảng nghiệp vụ công nợ: `debt_payments`.
- CHECK constraint cho số lượng, giá tiền, công nợ, role, trạng thái đơn hàng, trạng thái thanh toán.
- UNIQUE constraint cho email, SKU, mã màu, tên brand.
- INDEX cho khóa ngoại, tồn kho, công nợ và hạn trả.
- VIEW:
  - `v_product_inventory`.
  - `v_order_summary`.
  - `v_customer_debt_summary`.
  - `v_overdue_debts`.
- TRIGGER:
  - `trg_orders_before_insert`: tự thiết lập `payment_status` và hạn trả mặc định 15 ngày cho đơn công nợ.
  - `trg_orders_before_update`: chặn khôi phục đơn đã hủy và chuẩn hóa trạng thái thanh toán.
  - `trg_orders_after_update`: khi hủy đơn, tự hoàn sơn gốc, hoàn tinh màu, ghi log và giảm công nợ còn tồn.
  - `trg_orderdetails_before_insert`: kiểm tra số lượng, SKU, mã màu, base tương thích, tồn kho sơn gốc, tồn kho tinh màu và hạn mức công nợ ở cấp database.
  - `trg_orderdetails_after_insert`: tự trừ tồn kho kép, tính `orders.total_amount`, cộng `customers.current_debt`, ghi `inventory_logs`.
  - `trg_orderdetails_before_update`: chặn sửa trực tiếp dòng đơn hàng để tránh lệch tồn kho.
  - `trg_orderdetails_after_delete`: tự hoàn tồn kho và giảm công nợ khi xóa dòng đơn hàng.
  - `trg_debt_payments_before_insert`: kiểm tra số tiền trả nợ, kiểm tra đơn công nợ, chặn trả vượt số tiền còn lại.
  - `trg_debt_payments_after_insert`: tự giảm `customers.current_debt` và cập nhật `orders.payment_status` thành `partial` hoặc `paid`.
  - `trg_debt_payments_before_update/delete`: khóa lịch sử phiếu thu để bảo toàn kế toán.
- TRANSACTION trong API tạo đơn admin và API khách hàng gửi yêu cầu đặt hàng.

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
source C:/duong-dan-toi-project/KhanhPaint/khanhpaintdealerdatabase.sql
```

Hoặc dùng MySQL Workbench: mở file `khanhpaintdealerdatabase.sql` rồi chạy toàn bộ script.

File SQL đã có dữ liệu mẫu để demo dashboard, tồn kho, công thức màu, đơn hàng, trigger, log kho, công nợ có hạn trả và báo cáo.

## Dữ liệu demo mở rộng đã bổ sung

File `khanhpaintdealerdatabase.sql` đã được bổ sung bộ dữ liệu demo phong phú hơn để khi thuyết trình có đủ tình huống thực tế:

- 6 thương hiệu: Dulux, Jotun, Nippon Paint, Kova, Maxilite, Mykolor.
- 16 dòng sản phẩm: nội thất, ngoại thất, chống thấm, sơn lót, sơn phủ phổ thông và cao cấp.
- 24 loại base: Base A, Base B, Base C, White Base, Clear Base, base ngoại thất, base chống thấm.
- 72 biến thể sản phẩm theo dung tích 1L, 5L, 18L, có SKU, giá bán, tồn kho và vị trí kho.
- 14 loại tinh màu với tồn kho ml và đơn giá/ml.
- 48 mã màu demo, mỗi mã màu gắn với đúng `base_id` tương thích.
- 120+ dòng công thức pha màu trong `colorsystem_colorants`, có định lượng `amount_ml` để trigger tự trừ tinh màu.
- 5 chức vụ, 7 nhân viên, 3 ca làm và lịch phân công ca nhiều ngày.
- 8 khách hàng mẫu đại diện các tình huống: không nợ, đang nợ, gần vượt hạn mức, quá hạn, thanh toán một phần, đã tất toán đủ.
- 10 đơn hàng mẫu gồm đơn tiền mặt, đơn công nợ, đơn pending, đơn quá hạn và đơn đã thanh toán đủ.

File `scripts/demo-seed-data.sql` cũng chứa riêng phần seed demo nếu cần xem hoặc tái sử dụng dữ liệu mẫu. Lưu ý: tên sản phẩm và công thức màu là dữ liệu mô phỏng cho bài tập, không phải công thức chính thức từ nhà sản xuất.

## Tài khoản demo

Tạo admin mới:

```bash
npm run create-admin
```

Dữ liệu mẫu cũng có tài khoản demo đã hash mật khẩu bằng cùng chuỗi hash mẫu trong hệ thống. Nếu không đăng nhập được bằng dữ liệu mẫu, hãy dùng script `npm run create-admin` để tạo tài khoản admin mới và đăng ký tài khoản khách hàng mới từ giao diện client.

Trang admin:

```text
http://localhost:3000/admin/login.html
```

Trang khách hàng:

```text
http://localhost:3000/client/
```

## Chạy server

```bash
npm start
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Luồng demo đề xuất

1. Đăng nhập admin.
2. Mở Dashboard để xem tổng quan.
3. Vào Tồn kho kép để xem tồn sơn gốc và tinh màu.
4. Vào Công thức màu để tra cứu mã màu.
5. Vào Đơn hàng để tạo đơn công nợ có hạn trả.
6. Mở chi tiết đơn hàng để xem tổng tiền, dòng hàng và log tồn kho do trigger sinh ra.
7. Vào Khách hàng & công nợ để xem hạn mức, hạn trả, đơn quá hạn và ghi nhận thanh toán.
8. Đăng nhập/đăng ký tài khoản khách hàng.
9. Vào Sản phẩm để chọn sản phẩm, chọn mã màu, gửi yêu cầu đặt hàng.
10. Vào Đơn hàng của khách để xem lịch sử mua hàng và thử chức năng mua lại màu cũ.
11. Vào Hồ sơ & công nợ của khách để xem công nợ hiện tại, hạn trả, đơn quá hạn và lịch sử thanh toán.

## Lưu ý đóng gói nộp bài

- Không đưa `.env` lên GitHub hoặc bản nộp vì chứa mật khẩu database và JWT secret.
- Không cần nộp `node_modules`, chỉ cần `package.json` và `package-lock.json`.
- Nếu đổi tên database trong `.env`, cần đổi tương ứng trong file SQL hoặc tạo database đúng tên.
