const express = require("express");
const router = express.Router();
const db = require("../../db");

function cleanText(value) {
  const text = String(value || "").trim();
  return text === "" ? null : text;
}

function handleDbError(res, err, message) {
  console.error(message, err);
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Dữ liệu đã tồn tại." });
  }
  return res.status(500).json({ error: "Lỗi xử lý dữ liệu." });
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT brand_id, name, origin, description FROM brands ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    handleDbError(res, err, "Get brands error:");
  }
});

router.post("/add", async (req, res) => {
  const name = cleanText(req.body.name);
  const origin = cleanText(req.body.origin);
  const description = cleanText(req.body.description);

  if (!name) {
    return res.status(400).json({ error: "Tên thương hiệu không được để trống." });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO brands (name, origin, description) VALUES (?, ?, ?)",
      [name, origin, description]
    );
    res.status(201).json({
      success: true,
      brand_id: result.insertId,
      message: "Thêm thương hiệu thành công.",
    });
  } catch (err) {
    handleDbError(res, err, "Create brand error:");
  }
});

module.exports = router;
