const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const bcrypt = require("bcrypt");
const db = require("../db");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const fullName = String(await rl.question("Họ tên admin: ")).trim();
    const email = normalizeEmail(await rl.question("Email admin: "));
    const password = String(await rl.question("Mật khẩu admin: "));

    if (!fullName || !isValidEmail(email) || password.length < 6) {
      throw new Error("Thông tin không hợp lệ. Mật khẩu cần tối thiểu 6 ký tự.");
    }

    await db.query(
      `INSERT INTO jobs (job_title, min_salary, max_salary)
       VALUES ('Quản trị viên', NULL, NULL)
       ON DUPLICATE KEY UPDATE job_title = VALUES(job_title)`
    );

    const [jobs] = await db.query(
      "SELECT job_id FROM jobs WHERE job_title = 'Quản trị viên' LIMIT 1"
    );

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO employees
       (full_name, email, phone, hire_date, password_hash, job_id, role)
       VALUES (?, ?, NULL, CURRENT_DATE, ?, ?, 'admin')`,
      [fullName, email, passwordHash, jobs[0].job_id]
    );

    console.log("Tạo tài khoản admin thành công.");
  } finally {
    rl.close();
    await db.end?.();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Không thể tạo admin:", err.message);
  process.exit(1);
});
