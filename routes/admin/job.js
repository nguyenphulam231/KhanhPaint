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

// 3. CẬP NHẬT CÔNG VIỆC (MỚI)
router.put("/update/:id", async (req, res) => {
  const jobId = req.params.id;
  const { job_title, min_salary, max_salary } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE Jobs SET job_title = ?, min_salary = ?, max_salary = ? WHERE job_id = ?",
      [job_title, min_salary || null, max_salary || null, jobId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy vị trí công việc để cập nhật!" });
    }
    res.json({ message: "Cập nhật vị trí công việc thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. XÓA CÔNG VIỆC (MỚI)
router.delete("/delete/:id", async (req, res) => {
  const jobId = req.params.id;
  try {
    const [result] = await db.query("DELETE FROM Jobs WHERE job_id = ?", [
      jobId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy vị trí công việc để xóa!" });
    }
    res.json({ message: "Đã xóa vị trí công việc!" });
  } catch (err) {
    // Lưu ý: Nếu có nhân viên đang gắn với job này, SQL sẽ báo lỗi khóa ngoại (Foreign Key Constraint)
    res
      .status(500)
      .json({
        error:
          "Không thể xóa vị trí này vì đang có nhân viên thuộc vị trí này!" ||
          err.message,
      });
  }
});

module.exports = router;
