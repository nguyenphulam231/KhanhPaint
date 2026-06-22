const express = require("express");
const router = express.Router();
const db = require("../../db");

// Lấy danh sách ca làm
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM shifts ORDER BY start_time ASC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm mới ca làm
router.post("/add", async (req, res) => {
  const { shift_name, start_time, end_time } = req.body;

  if (!shift_name || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền đầy đủ thông tin ca làm.",
    });
  }

  try {
    const sql =
      "INSERT INTO shifts (shift_name, start_time, end_time) VALUES (?, ?, ?)";
    await db.execute(sql, [shift_name, start_time, end_time]);
    res
      .status(201)
      .json({ success: true, message: "Thêm ca làm việc thành công!" });
  } catch (error) {
    console.error("Lỗi thêm ca:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi thêm ca làm." });
  }
});

router.post("/assign", async (req, res) => {
  const { employee_id, shift_id, working_date } = req.body;

  if (!employee_id || !shift_id || !working_date) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin phân ca." });
  }

  try {
    const sql =
      "INSERT INTO employees_shifts (employee_id, shift_id, working_date) VALUES (?, ?, ?)";
    await db.execute(sql, [employee_id, shift_id, working_date]);
    res.status(201).json({ success: true, message: "Đã phân ca thành công!" });
  } catch (error) {
    console.error("Lỗi phân ca:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi phân ca." });
  }
});

module.exports = router;
