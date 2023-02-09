const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // const account = await Account.findById(decoded.id).select("-password");
      req.id = decoded.id;
      next();
    } catch (error) {
      console.log("jwt verify error");
      console.log(error.message);
      res.status(401).send({ 
        message: error.message, 
        redirect: true });
      //throw new Error("Not authorized");
    }
  }
  if (!token) {
    console.log("jwt not exist error");
    res.status(401).send({
      message: "Token not authorized",
      redirect: true,
    });
    // throw new Error("Not authorized");
  }
});

module.exports = protect;
