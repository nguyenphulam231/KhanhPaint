const express = require("express");
const app = express();
const path = require("path");
const db = require("./db"); // Giả định file kết nối DB của bạn là db.js

// 1. Middleware: Phục vụ file tĩnh (HTML, CSS, JS) từ thư mục 'public'
app.use(express.static(path.join(__dirname, "public")));

// 2. Middleware: Xử lý dữ liệu JSON
app.use(express.json());

// 3. Routes: Cấu hình các API
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/orders", require("./routes/order"));
app.use("/api/products", require("./routes/product"));

// 4. Route trang chủ: Tự động phục vụ file index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 5. Khởi động Server sau khi kết nối DB thành công
db.query("SELECT 1")
  .then(() => {
    console.log("Kết nối Database thành công!");
    app.listen(3000, () =>
      console.log("Server đang chạy tại: http://localhost:3000"),
    );
  })
  .catch((err) => {
    console.error("Kết nối Database thất bại: " + err.message);
    process.exit(1);
  });
