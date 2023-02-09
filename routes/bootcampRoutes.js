const express = require("express");
const router = express.Router();
const { read, readOne } = require("../controllers/bootcampController");

router.get("/", read);
router.get("/:id", readOne);

module.exports = router;
