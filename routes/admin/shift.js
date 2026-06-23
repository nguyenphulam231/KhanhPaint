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
      return res.status(404).json({
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
    res.status(500).json({
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

// 6. PHÂN CA HÀNG LOẠT THEO LỊCH TUẦN (Đã tối ưu cho Khóa phức hợp: employee_id, shift_id, working_date)
router.post("/assign-bulk", async (req, res) => {
  const { employee_id, start_date, end_date, weekly_pattern } = req.body;

  if (!employee_id || !start_date || !end_date || !weekly_pattern) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin cấu hình phân ca." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const start = new Date(start_date);
    const end = new Date(end_date);
    const insertValues = [];

    let current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0: Chủ Nhật, 1: Thứ 2,...
      const formattedDate = current.toISOString().split("T")[0];

      const shiftsForThisDay = weekly_pattern[dayOfWeek];
      if (
        shiftsForThisDay &&
        Array.isArray(shiftsForThisDay) &&
        shiftsForThisDay.length > 0
      ) {
        shiftsForThisDay.forEach((shiftId) => {
          insertValues.push([employee_id, shiftId, formattedDate]);
        });
      }
      current.setDate(current.getDate() + 1);
    }

    if (insertValues.length > 0) {
      // Sử dụng INSERT IGNORE: Nếu trùng lịch cũ (trùng cả 3 trường khóa chính) thì bỏ qua, không báo lỗi hệ thống
      const sql =
        "INSERT IGNORE INTO employees_shifts (employee_id, shift_id, working_date) VALUES ?";
      const [result] = await connection.query(sql, [insertValues]);

      await connection.commit();
      res.status(201).json({
        success: true,
        message: `Đã xử lý đắp lịch tuần thành công! Tạo mới thành công ${result.affectedRows} ca làm việc (Các ca trùng lịch cũ đã được tự động bỏ qua).`,
      });
    } else {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy ca làm việc nào khớp để xếp lịch!",
      });
    }
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi phân ca hàng loạt:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đắp lịch tuần: " + error.message,
    });
  } finally {
    connection.release();
  }
});

// 7. API LẤY DANH SÁCH LỊCH ĐÃ PHÂN ĐỂ XEM
router.get("/assigned-list", async (req, res) => {
  const { employee_id, start_date, end_date } = req.query;

  let conditions = [];
  let params = [];

  if (employee_id) {
    conditions.push("es.employee_id = ?");
    params.push(employee_id);
  }
  if (start_date) {
    conditions.push("es.working_date >= ?");
    params.push(start_date);
  }
  if (end_date) {
    conditions.push("es.working_date <= ?");
    params.push(end_date);
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const query = `
      SELECT 
  es.employee_id,
  es.shift_id,
  es.working_date,
  e.full_name,
  s.shift_name,
  s.start_time,
  s.end_time
FROM employees_shifts es
JOIN shifts s ON es.shift_id = s.shift_id
JOIN employees e ON es.employee_id = e.employee_id
${whereClause}
ORDER BY es.working_date DESC, s.start_time ASC
    `;
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Lỗi SQL assigned-list:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 8. API LẤY LỊCH LÀM VIỆC CỦA MỘT NHÂN VIÊN CỤ THỂ (MỚI)
router.get("/employee-calendar/:empId", async (req, res) => {
  const { empId } = req.params;
  try {
    const query = `
      SELECT 
        es.working_date,
        s.shift_name,
        s.start_time,
        s.end_time
      FROM employees_shifts es
      JOIN shifts s ON es.shift_id = s.shift_id
      WHERE es.employee_id = ?
      ORDER BY es.working_date ASC
    `;
    const [rows] = await db.execute(query, [empId]);
    res.json(rows);
  } catch (err) {
    console.error("Lỗi lấy lịch nhân viên:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 9. XÓA 1 CA ĐÃ PHÂN
router.delete("/assigned/single", async (req, res) => {
  const { employee_id, shift_id, working_date } = req.body;

  if (!employee_id || !shift_id || !working_date) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin!" });
  }

  try {
    const [result] = await db.execute(
      "DELETE FROM employees_shifts WHERE employee_id = ? AND shift_id = ? AND working_date = ?",
      [employee_id, shift_id, working_date],
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca để xóa!" });
    }
    res.json({ success: true, message: "Đã xóa ca thành công!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. XÓA NHIỀU CA ĐÃ PHÂN
router.delete("/assigned/bulk-delete", async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Danh sách không hợp lệ!" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of items) {
      await connection.execute(
        "DELETE FROM employees_shifts WHERE employee_id = ? AND shift_id = ? AND working_date = ?",
        [item.employee_id, item.shift_id, item.working_date],
      );
    }
    await connection.commit();
    res.json({
      success: true,
      message: `Đã xóa ${items.length} ca thành công!`,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
