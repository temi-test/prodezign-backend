const express = require("express");
const router = express.Router();
const { read, readOne, readEnrollment } = require("../controllers/bootcampController");

router.get("/", read);
router.get("/:id", readOne);
router.get("/enrollment/:id", readEnrollment);

module.exports = router;
