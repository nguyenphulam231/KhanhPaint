require("./config/loadEnv");
const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth/admin", require("./routes/admin/auth"));
app.use("/api/auth/public", require("./routes/client/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/public/products", require("./routes/client/product"));
app.use("/api/public/orders", require("./routes/client/order"));

app.get("/", (req, res) => res.redirect("/client/index.html"));
app.get("/client", (req, res) => res.redirect("/client/index.html"));
app.get("/client/login", (req, res) => res.redirect("/client/login.html"));
app.get("/client/register", (req, res) => res.redirect("/client/register.html"));
app.get("/client/products", (req, res) => res.redirect("/client/products.html"));
app.get("/client/orders", (req, res) => res.redirect("/client/order-history.html"));
app.get("/admin", (req, res) => res.redirect("/admin/index.html"));
app.get("/admin/login", (req, res) => res.redirect("/admin/login.html"));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Không tìm thấy API." });
  }
  return res.status(404).send("Không tìm thấy trang.");
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Lỗi hệ thống." });
});

db.query("SELECT 1")
  .then(() => {
    console.log("Kết nối Database thành công!");
    app.listen(PORT, () => console.log(`Server đang chạy tại: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Kết nối Database thất bại: " + err.message);
    process.exit(1);
  });
