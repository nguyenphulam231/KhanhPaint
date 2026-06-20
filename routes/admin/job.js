const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT job_id, job_title, min_salary, max_salary FROM jobs ORDER BY job_title"
    );
    res.json(rows);
  } catch (err) {
    console.error("Get jobs error:", err);
    res.status(500).json({ error: "Lỗi tải danh sách vị trí." });
  }
});

router.post("/add", async (req, res) => {
  const job_title = String(req.body.job_title || "").trim();
  const min_salary = req.body.min_salary === "" ? null : req.body.min_salary;
  const max_salary = req.body.max_salary === "" ? null : req.body.max_salary;

  if (!job_title) {
    return res.status(400).json({ error: "Tên vị trí không được để trống." });
  }

  try {
    await db.query(
      "INSERT INTO jobs (job_title, min_salary, max_salary) VALUES (?, ?, ?)",
      [job_title, min_salary, max_salary]
    );
    res.status(201).json({ message: "Đã tạo vị trí mới!" });
  } catch (err) {
    console.error("Create job error:", err);
    res.status(500).json({ error: "Lỗi tạo vị trí." });
  }
});

module.exports = router;
