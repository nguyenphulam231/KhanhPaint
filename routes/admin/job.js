const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM Jobs");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/add", async (req, res) => {
  const { job_title, min_salary, max_salary } = req.body;
  try {
    await db.query(
      "INSERT INTO Jobs (job_title, min_salary, max_salary) VALUES (?, ?, ?)",
      [job_title, min_salary, max_salary],
    );
    res.status(201).json({ message: "Đã tạo vị trí mới!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
