const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
 const env = require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
/// initailizing mongodb connection
mongoose
  .connect(process.env.DB_CONN_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("mongodb connected");
  });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const whitelist = ["http://localhost:3000"];
const prod_whitelist = ["https://prodezign.onrender.com"]
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || prod_whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use("/auth", require("./routes/authRoutes"));
app.use("/bootcamp", require("./routes/bootcampRoutes"));
app.listen(port, () => console.log("prodezign server started on port " + port));
