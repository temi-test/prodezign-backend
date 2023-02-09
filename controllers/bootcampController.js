const asyncHandler = require("express-async-handler");
const Bootcamp = require("../models/bootcampModel");

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

module.exports = {
  read,
  readOne,
};
