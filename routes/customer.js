const express = require("express");
const router = express.Router();
const db = require("../db");

// Lấy danh sách khách hàng
router.get("/", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM Customers");
  res.json(rows);
});

// Thêm khách hàng mới
router.post("/", async (req, res) => {
  const { name, phone, address } = req.body;
  await db.query(
    "INSERT INTO Customers (name, phone, address) VALUES (?, ?, ?)",
    [name, phone, address],
  );
  res.json({ message: "Đã thêm khách hàng!" });
});

module.exports = router;
