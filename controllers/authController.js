const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");

const Account = require("../models/accountModel");
const Verification = require("../models/emailVerificationModel");
const Enrollment = require("../models/enrollmentModel");
const sendVerificationEmail = require("../utils/sendEmail");

const randomBytes = crypto.randomBytes(16);
const CRYPTOKEY = crypto.createCipher(
  "aes-128-cbc",
  process.env.FLASHPAY_SECRET,
  randomBytes
);

// const crypto = require("crypto");

//// Login in user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const account = await Account.findOne({ email });
  // console.log("account exist result");
  // console.log(account);

  if (!account) {
    // console.log("account does not exist login error");
    return res.status(500).send({
      message:
        "Unable to login. Invalid username or email. Unable to login. Invalid username or email",
      status: "error",
    });
  }

  const valid_password = await bcrypt.compare(password, account.password);
  /// check if password match
  if (!valid_password) {
    // console.log("invalid password error");
    return res.status(409).send({
      message: "Unable to login. Invalid username or email.",
      status: "error",
    });
  }

  const token = await generateJWTToken(account._id);

  /// check if user is verified
  if (!account.verified) {
    // console.log(
    //   "account has not been verified....sending verification email again"
    // );

    let verification = await Verification.findOne({ user_id: account._id });

    // if verification token doesn't exist for user in database
    /// then create a new token
    if (!verification) {
      // console.log("verification dosent exist....saving new token");
      verification = new Verification({
        user_id: account._id,
        token: "123456",
      });

      // console.log(verification);
      const verification_result = await verification.save();

      // console.log(verification_result);

      /// note one line
      if (!verification_result) {
        // console.log("error saving new token");
        return res
          .status(500)
          .send({ message: "could not save verification token" });
      }
      // send email here
      const email_sent = await sendVerificationEmail(
        account.email,
        "Verify Your Email Address To get Started",
        verification.token
      );
      // console.log("email sent result");
      // console.log(email_sent);
    }

    // if verification token exist for user in database
    /// then return the following response
    return res.status(200).json({
      status: "success",
      message:
        "Please verify your account. Verification code has been sent to your email",
      account: {
        ...account.toObject(),
      },
      token: token,
    });
  }

  /// if user passses the above  log the user in
  console.log("account below");
  console.log(account);

  // Get the courses/bootcamps user has enrolled in
  let enrollment_result = await Enrollment.find({ user_id: account._id });
  if (!enrollment_result) {
    console.log("server error getting users enrollment");
    return res.status(500).send({
      message: "Unable to login due to server error. Please try again",
      status: "error",
    });
  }
  res.status(200).send({
    status: "success",
    message: " Login successful and email has been successfully verified",
    account: {
      ...account.toObject(),
    },
    enrollments: enrollment_result,
    token: token,
  });
});

const signup = asyncHandler(async (req, res) => {
  const payload = req.body;
  // console.log(payload);
  /// Check if user exist
  const isExist = await Account.findOne({ email: payload.email });
  if (isExist) {
    console.log("Account exists");
    console.log(isExist);
    return res.status(409).send({
      message: "An account already exist with this email.",
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(payload.password, salt);

 
  const account = new Account({ ...payload, password: hashedPassword });

  const result = await account.save();
  if (result) {
    // console.log("account created");
    // console.log(result);

    const auth_token = await generateJWTToken(account._id);
    // Email Sending Code here
    const verification = new Verification({
      account_id: account._id,
      // token: crypto.randomBytes(32).toString.hex, for some reason crypto is not working
      token: "123456",
    });

    const verification_save = await verification.save();
    console.log("verification save success");
    console.log(verification_save);
    //  const url = `${process.env.BASE_URL}users/${user._id}/verify/${verification.token}`;
    // will need to customize the text or body of the email later
    const email_sent = await sendVerificationEmail(
      account.email,
      "Verify Your Email Address To get Started",
      verification.token
    );
    console.log("email sent result");
    console.log(email_sent);

    res.status(201).json({
      status: "success",
      message:
        "Your Account has been created. Please verify your account. A verification token has been sent to your email",
      account: {
        ...result.toObject(),
      },
      token: auth_token,
    });
  } else {
    console.log("error creating account");
    res
      .status(500)
      .send({ message: "Server error while creating your account" });
  }
});

/// test this
const verify = asyncHandler(async (req, res) => {
  /// get the user id from the req param

  // console.log("payload debug");
  // console.log(req.body);
  const user_id = req.id;
  // console.log(user_id);

  // next check if the account id exist in the accounts collection
  let account = await Account.findById(user_id);
  if (!account) {
    console.log("account not found");
    console.log(account);
    return res.status(404).send({
      status: "error",
      message: "Invalid user. Please login again to your account",
    });
  }

  // next check if user and otp match the database record
  // get the token and check if it exist for the user
  const token = await Verification.findOne({
    user_id: user_id,
    token: req.body.otp,
  });

  // console.log("token result");
  // console.log(token);

  if (!token) {
    console.log("token result");
    console.log(token);
    return res.status(404).send({
      status: "error",
      message: "OTP is invalid. Please confirm",
    });
  }

  /// update the users verified status
  account = await Account.findByIdAndUpdate(
    user_id,
    { verified: true },
    {
      new: true,
    }
  );
  // check if update was successful

  // delete the token
  await token.remove();
  //check if the delete was successful

  res.status(200).send({
    message: "Email has been successfully verified",
  });
});

/// test this also
const resendVerification = asyncHandler(async (req, res) => {
  // check if user requesting for verification exist in database
  const user = await User.findOne({
    user_id: req.params.id,
  });
  if (!user) {
    console.log("error sending verification token");
    console.log(result);
    return res.status(500).send({
      status: "Failure",
      message: "There was an error. Please try again",
    });
  }
  /// send email here

  /// NOTE..........NOTE...........NOTE........NOTE
  //// need to use a findAndupdate here....
  //// incase a token already exist for the user in the database
  const verification = new Verification({
    user_id: user._id,
    token: "123456",
  });
  let result = await verification.save();

  if (!result) {
    console.log("error sending verification token");
    console.log(result);
    return res.status(500).send({
      status: "Failure",
      message: "There was an error. Please try again",
    });
  }

  /// will need to customize the text or body of the email later
  await sendVerificationEmail(user.email, "Verify Email", verification.token);
  res.status(201).json({
    status: "success",
    message:
      "verification token has been sent to yur email account. Please verify",
  });
});

const generateJWTToken = async (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const readUser = asyncHandler(async (req, res) => {
  const user_id = req.id;
  try {
    const result = await Account.findById(user_id);
    // means record does not exits in database
    if (!result) {
      // console.log("no user account matches id gotten from token");
      // console.log(result);
      return res.status(404).send({
        redirect: true,
        message: "No user account matches the Bearer token in database",
      });
    }
    // console.log("success reading account data");
    // console.log(result);

    // Get the courses/bootcamps user has enrolled in
    const enrollment_result = await Enrollment.find({ user_id: result._id });
    console.log("enrollment result");
    console.log(enrollment_result);
    // if (!enrollment_result) {
    //   console.log("server error getting users enrollment");
    //   return res.status(500).send({
    //     message: "Unable to signin due to server error. Please try again",
    //     status: "error",
    //   });
    // }
    res.status(200).send({ account: result, data: enrollment_result });
  } catch (error) {
    res.status(500).send({
      message:
        "Unable to initialize your account due to server error. Please try again",
    });
  }
});

module.exports = {
  login,
  signup,
  verify,
  resendVerification,
  readUser,
};
