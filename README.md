# KhanhPaint Management Database System

## Cách chạy project

1. Cài dependency:

```bash
npm install
```

2. Tạo database bằng file SQL:

```bash
mysql -u root -p < khanhpaintdealerdatabase.sql
```

3. Tạo file cấu hình môi trường:

```bash
cp .env.example .env
```

Sau đó mở `.env` và sửa `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` cho đúng máy của bạn.
`JWT_SECRET` cần tối thiểu 32 ký tự.

4. Tạo tài khoản admin đầu tiên:

```bash
npm run create-admin
```

5. Chạy server:

```bash
npm start
```

Hoặc chạy chế độ dev:

```bash
npm run dev
```

6. Mở trình duyệt:

```text
http://localhost:3000
```

## Các lỗi đã sửa trong bản này

- Bỏ mật khẩu MySQL và JWT secret hard-code khỏi source code.
- Thêm `.env.example` và `.gitignore`.
- Sửa route dashboard từ `/api/admin/dashboard/dashboard` thành `/api/admin/dashboard`.
- Mount lại route sản phẩm dưới `/api/admin/products` và bắt buộc có token admin.
- Sửa code dùng tên bảng lowercase để chạy ổn hơn trên MySQL/Linux.
- Sửa bảng `customers` để khớp với chức năng đăng ký/đăng nhập khách hàng.
- Viết lại thứ tự tạo bảng SQL theo khóa ngoại, tránh lỗi import lại database.
- Không trả thẳng lỗi SQL chi tiết ra client.
