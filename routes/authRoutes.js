const express = require('express');
const router = express.Router();

// const userSchema  = require("../validations/userValidation");
const protect = require("../middleware/authMiddleware")
const { login, signup, verify, resendVerification, readUser} = require("../controllers/authController");

//// Signup
router.post("/signup",  signup);
// Login
router.post("/login",  login);

// get user
router.get("/", protect, readUser); //// only a logged in user can a

/// Verify token
router.post("/verify", protect, verify); 
/// Resend Token
router.get("/verification/resend/:id", resendVerification);

module.exports = router;