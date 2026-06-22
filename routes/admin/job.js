const express = require("express");
const router = express.Router();
const db = require("../../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM jobs ORDER BY job_id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/add", async (req, res) => {
  const { job_title, min_salary, max_salary } = req.body;
  if (!job_title) return res.status(400).json({ error: "Tên vị trí không được để trống." });

  try {
    await db.query(
      "INSERT INTO jobs (job_title, min_salary, max_salary) VALUES (?, ?, ?)",
      [job_title.trim(), min_salary || null, max_salary || null],
    );
    res.status(201).json({ message: "Đã tạo vị trí mới." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/update/:id", async (req, res) => {
  const { job_title, min_salary, max_salary } = req.body;
  if (!job_title) return res.status(400).json({ error: "Tên vị trí không được để trống." });

  try {
    const [result] = await db.query(
      "UPDATE jobs SET job_title = ?, min_salary = ?, max_salary = ? WHERE job_id = ?",
      [job_title.trim(), min_salary || null, max_salary || null, req.params.id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy vị trí công việc." });
    res.json({ message: "Cập nhật vị trí công việc thành công." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM jobs WHERE job_id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Không tìm thấy vị trí công việc." });
    res.json({ message: "Đã xóa vị trí công việc." });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({ error: "Không thể xóa vị trí này vì đang có nhân viên thuộc vị trí này." });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
