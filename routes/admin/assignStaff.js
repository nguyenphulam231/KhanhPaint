// =========================================================================
// HELPER: TỰ ĐỘNG GÁN NHÂN VIÊN SALE & TECH CHO ĐƠN HÀNG THEO CA LÀM VIỆC
// =========================================================================
//
// Quy tắc:
// 1. Xác định "ca đang xét" (shift_id + working_date):
//    - Nếu thời điểm hiện tại nằm trong [start_time, end_time) của 1 ca
//      đang diễn ra hôm nay -> dùng ca đó + hôm nay.
//    - Nếu không (ngoài giờ ca) -> tìm ca có start_time gần nhất SẮP TỚI
//      trong hôm nay; nếu hôm nay đã hết ca -> lấy ca có start_time nhỏ
//      nhất, áp dụng cho ngày mai.
// 2. Với ca đang xét, lấy danh sách nhân viên đã được lên lịch
//    (employees_shifts) cho đúng shift_id + working_date đó, lọc theo
//    job_title ('Bán hàng' cho sale, 'Pha sơn' cho tech).
// 3. Trong từng nhóm, chọn người có ÍT ĐƠN NHẤT đã được gán trong đúng
//    ca/ngày đang xét (đếm theo orders.shift_id + ngày đặt đơn). Hòa nhau
//    -> chọn employee_id nhỏ nhất.
// 4. Nếu nhóm rỗng (không ai được lên lịch ca đó) -> trả về null, để
//    admin gán tay sau.
//
// Lưu ý: Tất cả ca được giả định KHÔNG vắt qua đêm (start_time < end_time
// trong cùng ngày).

const JOB_TITLE_SALE = "Bán hàng";
const JOB_TITLE_TECH = "Pha sơn";

/**
 * Format Date -> 'YYYY-MM-DD' (theo giờ local của server).
 */
function toDateOnlyStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format Date -> 'HH:MM:SS' (theo giờ local của server).
 */
function toTimeOnlyStr(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${mi}:${s}`;
}

/**
 * Cộng thêm n ngày vào 1 Date, trả về Date mới (không sửa Date gốc).
 */
function addDays(date, n) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * Xác định "ca đang xét" tại thời điểm `now`.
 *
 * @param {object} connection - kết nối DB (mysql2/promise connection)
 * @param {Date} now - thời điểm đặt hàng (mặc định: thời điểm hiện tại)
 * @returns {Promise<{shift_id: number, working_date: string} | null>}
 *          working_date dạng 'YYYY-MM-DD'. Trả về null nếu hệ thống
 *          chưa cấu hình ca nào (bảng shifts trống).
 */
async function resolveTargetShift(connection, now = new Date()) {
  const [shifts] = await connection.query(
    "SELECT shift_id, start_time, end_time FROM shifts ORDER BY start_time ASC",
  );

  if (!shifts || shifts.length === 0) return null;

  const nowTimeStr = toTimeOnlyStr(now);
  const todayStr = toDateOnlyStr(now);

  // --- Trường hợp 1: đang trong 1 ca hôm nay ---
  // start_time/end_time từ MySQL TIME trả về dạng 'HH:MM:SS' (string),
  // so sánh trực tiếp bằng string là an toàn vì cùng định dạng.
  const currentShift = shifts.find(
    (s) => nowTimeStr >= s.start_time && nowTimeStr < s.end_time,
  );
  if (currentShift) {
    return { shift_id: currentShift.shift_id, working_date: todayStr };
  }

  // --- Trường hợp 2: không trong ca nào -> tìm ca sắp tới gần nhất hôm nay ---
  const upcomingToday = shifts.find((s) => s.start_time > nowTimeStr);
  if (upcomingToday) {
    return { shift_id: upcomingToday.shift_id, working_date: todayStr };
  }

  // --- Trường hợp 3: hôm nay đã hết ca -> lấy ca đầu tiên của ngày mai ---
  const firstShiftTomorrow = shifts[0]; // đã sort theo start_time ASC
  const tomorrowStr = toDateOnlyStr(addDays(now, 1));
  return { shift_id: firstShiftTomorrow.shift_id, working_date: tomorrowStr };
}

/**
 * Lấy danh sách nhân viên đã được lên lịch cho đúng (shift_id, working_date),
 * lọc theo job_title.
 *
 * @returns {Promise<Array<{employee_id: number}>>}
 */
async function getScheduledEmployees(
  connection,
  shiftId,
  workingDate,
  jobTitle,
) {
  const query = `
    SELECT e.employee_id
    FROM employees_shifts es
    JOIN employees e ON e.employee_id = es.employee_id
    JOIN jobs j ON j.job_id = e.job_id
    WHERE es.shift_id = ?
      AND es.working_date = ?
      AND j.job_title = ?
    ORDER BY e.employee_id ASC
  `;
  const [rows] = await connection.query(query, [
    shiftId,
    workingDate,
    jobTitle,
  ]);
  return rows;
}

/**
 * Đếm số đơn đã gán cho mỗi nhân viên (theo cột tương ứng: sales_rep_id
 * hoặc tech_id), CHỈ TÍNH trong đúng ca + ngày đang xét (dựa vào
 * orders.shift_id + DATE(orders.created_at)).
 *
 * Yêu cầu: bảng `orders` phải có cột `created_at` (xem
 * migration_add_created_at.sql).
 *
 * @param {string} role - 'sales_rep_id' hoặc 'tech_id'
 * @returns {Promise<Map<number, number>>} map employee_id -> số đơn
 */
async function countOrdersByEmployeeInShift(
  connection,
  role,
  shiftId,
  workingDate,
) {
  const column = role === "sales_rep_id" ? "sales_rep_id" : "tech_id";

  const query = `
    SELECT ${column} AS employee_id, COUNT(*) AS order_count
    FROM orders
    WHERE shift_id = ?
      AND DATE(created_at) = ?
      AND ${column} IS NOT NULL
    GROUP BY ${column}
  `;
  const [rows] = await connection.query(query, [shiftId, workingDate]);

  const map = new Map();
  rows.forEach((r) => map.set(r.employee_id, r.order_count));
  return map;
}

/**
 * Chọn 1 nhân viên có số đơn ít nhất trong danh sách đã lên lịch.
 * Hòa nhau -> employee_id nhỏ nhất (danh sách đầu vào đã sort ASC nên
 * chỉ cần giữ phần tử đầu tiên đạt min).
 *
 * @param {Array<{employee_id: number}>} scheduledEmployees - đã sort theo employee_id ASC
 * @param {Map<number, number>} orderCountMap
 * @returns {number | null} employee_id được chọn, null nếu danh sách rỗng
 */
function pickLeastBusyEmployee(scheduledEmployees, orderCountMap) {
  if (!scheduledEmployees || scheduledEmployees.length === 0) return null;

  let chosen = null;
  let minCount = Infinity;

  for (const emp of scheduledEmployees) {
    const count = orderCountMap.get(emp.employee_id) || 0;
    if (count < minCount) {
      minCount = count;
      chosen = emp.employee_id;
    }
    // Vì scheduledEmployees đã sort theo employee_id ASC, chỉ thay "chosen"
    // khi tìm được count THẤP HƠN (không phải <=), nên trường hợp hòa
    // nhau sẽ tự động giữ employee_id nhỏ nhất xuất hiện trước.
  }

  return chosen;
}

/**
 * Hàm chính: xác định ca đang xét + chọn ra sales_rep_id và tech_id phù hợp.
 *
 * @param {object} connection - kết nối DB đang trong transaction của route /add
 * @returns {Promise<{shift_id: number|null, sales_rep_id: number|null, tech_id: number|null}>}
 */
async function autoAssignStaffForOrder(connection) {
  const target = await resolveTargetShift(connection, new Date());

  // Không có ca nào được cấu hình trong hệ thống -> để admin gán tay hết
  if (!target) {
    return { shift_id: null, sales_rep_id: null, tech_id: null };
  }

  const { shift_id, working_date } = target;

  const [salesScheduled, techScheduled] = await Promise.all([
    getScheduledEmployees(connection, shift_id, working_date, JOB_TITLE_SALE),
    getScheduledEmployees(connection, shift_id, working_date, JOB_TITLE_TECH),
  ]);

  const [salesOrderCounts, techOrderCounts] = await Promise.all([
    countOrdersByEmployeeInShift(
      connection,
      "sales_rep_id",
      shift_id,
      working_date,
    ),
    countOrdersByEmployeeInShift(connection, "tech_id", shift_id, working_date),
  ]);

  const sales_rep_id = pickLeastBusyEmployee(salesScheduled, salesOrderCounts);
  const tech_id = pickLeastBusyEmployee(techScheduled, techOrderCounts);

  return { shift_id, sales_rep_id, tech_id };
}

module.exports = {
  autoAssignStaffForOrder,
  resolveTargetShift, // export thêm để viết unit test riêng
  pickLeastBusyEmployee,
  JOB_TITLE_SALE,
  JOB_TITLE_TECH,
};
