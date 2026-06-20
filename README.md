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

## Các trang chính

```text
/                       Trang chọn khu vực client/admin
/client/                Trang khách hàng
/client/login.html      Đăng nhập khách hàng
/client/register.html   Đăng ký khách hàng
/admin/login.html       Đăng nhập admin
/admin/                 Dashboard admin
```

## Các lỗi đã sửa trong bản này

- Sửa lại `routes/admin/index.js` bị merge nhầm thành code server chính.
- Tạo lại `public/index.html` để đường dẫn `/` không lỗi.
- Đồng bộ route frontend với backend qua `/api/admin/products/...`.
- Sửa các route `brand`, `line`, `base`, `variant` để khớp schema SQL.
- Sửa `line.js`: không insert các cột kỹ thuật vào `productlines` nữa.
- Sửa `base.js`: bắt buộc chọn `line_id`, insert đúng vào `basetypes`.
- Sửa `variant.js`: bỏ `line_id` khỏi `productvariants`, join qua `basetypes`.
- Bổ sung API `GET_VARIANTS`, `ADD_VARIANT`, `DELETE_VARIANT` trong `api.js`.
- Sửa redirect `/admin/login`, `/client/login`, `/client/register`.
- Bỏ mật khẩu MySQL và JWT secret hard-code khỏi source code.
- Thêm `.env.example` và `.gitignore`.
- Sửa bảng `customers` để khớp chức năng đăng ký/đăng nhập.
- Viết lại thứ tự tạo bảng SQL theo khóa ngoại.
- Không trả trực tiếp lỗi SQL chi tiết ra client.
- Loại `.git` và `node_modules` khỏi file zip nộp bài.
