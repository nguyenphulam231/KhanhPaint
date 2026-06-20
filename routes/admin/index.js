const express = require("express");
const router = express.Router();
const {
  authenticate,
  authorizeAdmin,
} = require("../../middleware/authMiddleware");

router.use(authenticate, authorizeAdmin);

router.use("/dashboard", require("./dashboard"));
router.use("/employees", require("./employee"));
router.use("/jobs", require("./job"));
router.use("/products", require("./product"));

module.exports = router;
