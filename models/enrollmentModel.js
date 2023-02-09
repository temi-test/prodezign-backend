const mongoose = require("mongoose");
const schema = mongoose.Schema;

const enrollmentSchema = new schema(
  {
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Database Exception. Account Id is required"],
      ref: "account",
      unique: true,
    },

    bootcamp_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Database Exception. Bootcamp Id is required"],
      ref: "bootcamps",
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Enrollment = mongoose.model("enrollment", enrollmentSchema);
module.exports = Enrollment;
