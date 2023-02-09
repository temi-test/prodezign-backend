const mongoose = require("mongoose");
const schema = mongoose.Schema;

const bootcampSchema = new schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },

    preview_img: {
      type: String,
      required: true,
    },

    // array of objects
    curriculum: {
      type: Array,
      required: true,
    },

    // instructors
    // array of insructors id strings
    team: [
      //   type: Array,
      //   required: true,
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "accounts",
      },
    ],
    // 63db9dbfdbf17ae47cc94a9d
    // 63db9e49dbf17ae47cc94a9e

    // 63db9e79dbf17ae47cc94a9f

    // projects
    /*
    // array of objects: {
        name: string, ///title of project 
        desc: string ///desc of project
    //}
    */
    projects: {
      type: Array,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Bootcamp = mongoose.model("bootcamp", bootcampSchema);
module.exports = Bootcamp;
