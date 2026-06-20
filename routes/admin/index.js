const express = require("express");
const router = express.Router();
const {
  authenticate,
  authorizeAdmin,
} = require("../../middleware/authMiddleware");

// 1. Áp dụng middleware NGAY ĐẦU TIÊN
router.use(authenticate, authorizeAdmin);

// 2. Sau đó mới đến các route (lúc này các route đã nằm sau middleware)
router.use("/dashboard", require("./dashboard"));
router.use("/employees", require("./employee"));
router.use("/jobs", require("./job"));
router.use("/brands", require("./brand"));
router.use("/lines", require("./line"));
router.use("/base", require("./base"));
router.use("/variants", require("./variant"));

module.exports = router;
