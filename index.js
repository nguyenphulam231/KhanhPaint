const express = require("express");
const path = require("path");
const db = require("./db");
const { getEnv } = require("./config/env");

const app = express();
const PORT = Number(getEnv("PORT", "3000"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth/admin", require("./routes/admin/auth"));
app.use("/api/auth/public", require("./routes/client/auth"));
app.use("/api/admin", require("./routes/admin"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin/login", (req, res) => {
  res.redirect("/admin/login.html");
});

app.get("/client/login", (req, res) => {
  res.redirect("/client/login.html");
});

app.get("/client/register", (req, res) => {
  res.redirect("/client/register.html");
});

app.use((req, res) => {
  res.status(404).json({ error: "Không tìm thấy tài nguyên." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Lỗi hệ thống." });
});

db.query("SELECT 1")
  .then(() => {
    console.log("Kết nối Database thành công!");
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Kết nối Database thất bại:", err.message);
    process.exit(1);
  });
