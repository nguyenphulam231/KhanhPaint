const express = require("express");
const router = express.Router();
const {
  authenticate,
  authorizeAdmin,
} = require("../../middleware/authMiddleware");

router.use(authenticate, authorizeAdmin);

router.use("/dashboard", require("./dashboard"));
router.use("/jobs", require("./job"));
router.use("/employees", require("./employee"));
router.use("/products", require("./product"));

// Backward-compatible routes for existing admin pages or old links.
router.use("/brands", require("./brand"));
router.use("/lines", require("./line"));
router.use("/base", require("./base"));
router.use("/variants", require("./variant"));

module.exports = router;
