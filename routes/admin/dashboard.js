const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [orders] = await db.query("SELECT * FROM Orders");
    res.json({ message: "Chào mừng Admin", data: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
