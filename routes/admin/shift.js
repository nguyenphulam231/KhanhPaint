const express = require("express");
const router = express.Router();
const db = require("../../db");

// 1. Lấy danh sách ca làm (Đã có - Giữ nguyên)
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

// 2. Thêm mới ca làm (Đã có - Chuẩn hóa định dạng response thống nhất)
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
    const [result] = await db.execute(sql, [shift_name, start_time, end_time]);
    res.status(201).json({
      success: true,
      shift_id: result.insertId,
      message: "Thêm ca làm việc thành công!",
    });
  } catch (error) {
    console.error("Lỗi thêm ca:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi thêm ca làm." });
  }
});

// 3. CẬP NHẬT THÔNG TIN CA LÀM (MỚI)
router.put("/update/:id", async (req, res) => {
  const shiftId = req.params.id;
  const { shift_name, start_time, end_time } = req.body;

  if (!shift_name || !start_time || !end_time) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng điền đầy đủ thông tin!" });
  }

  try {
    const sql = `
      UPDATE shifts 
      SET shift_name = ?, start_time = ?, end_time = ? 
      WHERE shift_id = ?
    `;
    const [result] = await db.execute(sql, [
      shift_name,
      start_time,
      end_time,
      shiftId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy dữ liệu ca làm để cập nhật!",
        });
    }
    res.json({ success: true, message: "Cập nhật ca làm việc thành công!" });
  } catch (error) {
    console.error("Lỗi cập nhật ca:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi cập nhật ca làm." });
  }
});

// 4. XÓA CA LÀM VIỆC (MỚI)
router.delete("/delete/:id", async (req, res) => {
  const shiftId = req.params.id;
  try {
    const [result] = await db.execute("DELETE FROM shifts WHERE shift_id = ?", [
      shiftId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca làm để xóa!" });
    }
    res.json({ success: true, message: "Đã xóa ca làm việc thành công!" });
  } catch (error) {
    console.error("Lỗi xóa ca:", error);
    // Bắt lỗi nếu ca làm này đã được gán cho nhân viên trong lịch trình làm việc (bảng employees_shifts)
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa ca làm này do dữ liệu đang được sử dụng trong bảng phân lịch làm việc của nhân viên!",
      });
    }
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi hệ thống khi thực hiện xóa ca làm.",
      });
  }
});

// 5. Phân ca cho nhân viên (Đã có - Giữ nguyên)
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
