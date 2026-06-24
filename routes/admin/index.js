const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../../middleware/authMiddleware");

router.use(authenticate, authorizeAdmin);

router.use("/dashboard", require("./dashboard"));
router.use("/orders", require("./order"));
router.use("/customers", require("./customer"));
router.use("/employees", require("./employee"));
router.use("/jobs", require("./job"));
router.use("/brands", require("./brand"));
router.use("/lines", require("./line"));
router.use("/base", require("./base"));
router.use("/variants", require("./variant"));
router.use("/colorants", require("./colorant"));
router.use("/colorsystem", require("./colorsystem"));
router.use("/shift", require("./shift"));

module.exports = router;
