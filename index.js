const express = require("express");
const app = express();
const path = require("path");
const db = require("./db");

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// --- ROUTES ĐÃ CẬP NHẬT ---

// 1. Auth routes (Giữ nguyên hoặc tùy chỉnh theo ý bạn)
app.use("/api/auth/admin", require("./routes/admin/auth"));
app.use("/api/auth/public", require("./routes/client/auth"));

// 2. Admin routes (Đã gom nhóm thành một cửa ngõ duy nhất)
// Khi gọi "/api/admin", nó sẽ nhảy vào file routes/admin/index.js
app.use("/api/admin", require("./routes/admin"));

// 3. Các routes khác
//app.use("/api/orders", require("./routes/order"));
//app.use("/api/products", require("./routes/admin/product"));

// --- KẾT THÚC CẬP NHẬT ---

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

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
