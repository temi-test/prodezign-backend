const asyncHandler = require("express-async-handler");
const Bootcamp = require("../models/bootcampModel");
const Enrollment = require("../models/enrollmentModel");

const read = asyncHandler(async (req, res) => {
  // returns all bootcamp in the database
  try {
    const result = await Bootcamp.find();
    // console.log("all bootcamp result");
    // console.log(result);
    if (!result) {
      // error getting all bootcamps
      res.status(500).send({
        message: "There was an internal server error.",
      });
      return;
    }
    return res.status(200).send(result);
  } catch (error) {
    // console.log(error);
    return res.status(500).send({
      message: "There was an internal server error.",
    });
  }
});

const readOne = asyncHandler(async (req, res) => {
  // returns all bootcamp in the database
  const id = req.params.id;
  try {
    const result = await Bootcamp.findById(id);
    // console.log("read one bootcamp result");
    // console.log(result);
    if (!result) {
      return res.status(500).send({
        message: "There was an internal server error.",
      });
    }
    return res.status(200).send(result);
  } catch (error) {
    // console.log(error);
    return res.status(500).send({
      message: "There was an internal server error.",
    });
  }
});


const readEnrollment = asyncHandler(async (req, res) => {
  const user_id = req.params.id
  console.log(user_id);
  try {
    // Get the courses/bootcamps user has enrolled in
    const enrollment_result = await Enrollment.find({ account_id: user_id }).populate(["bootcamp_id"]);
    console.log("enrollment result from read enrollment");
    console.log(enrollment_result);
    if (!enrollment_result) {
      console.log("server error getting users enrollment");
      return res.status(500).send({
        message:
          "Unable to get all your enrolled bootcamps due to server error. Please try again",
      });
    }
    res.status(200).send(enrollment_result);
  } catch (error) {
    res.status(500).send({
      message:
        "Unable to get all your enrolled bootcamps due to server error. Please try again",
    });
  }
});

module.exports = {
  read,
  readOne,
  readEnrollment,
};
