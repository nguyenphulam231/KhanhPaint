const express = require("express");
const router = express.Router();
const db = require("../db");

// Lấy danh sách nhân viên
router.get("/", async (req, res) => {
  const [rows] = await db.query(
    "SELECT employee_id, full_name, mail FROM Employees",
  );
  res.json(rows);
});

// Xem lịch làm việc của nhân viên
router.get("/schedule", async (req, res) => {
  const [rows] = await db.query(`
        SELECT e.full_name, s.shift_name, ss.working_date 
        FROM ShiftSchedules ss
        JOIN Employees e ON ss.employee_id = e.employee_id
        JOIN Shifts s ON ss.shift_id = s.shift_id
    `);
  res.json(rows);
});

module.exports = router;
