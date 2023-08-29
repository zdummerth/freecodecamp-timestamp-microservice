// index.js
// where your node app starts

// init project
var express = require("express");
var app = express();
require("dotenv").config();
const validUrl = require("valid-url");
var bodyParser = require("body-parser");

const shortId = require("shortid");
const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const connection = mongoose.connection;
connection.on("error", console.error.bind(console, "connection error:"));
connection.once("open", function () {
  console.log("MongoDB database connection established successfully");
});

const urlSchema = new Schema({
  original_url: String,
  short_url: String,
});

const URL = mongoose.model("URL", urlSchema);

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
var cors = require("cors");
app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", async function (req, res) {
  const url = req.body.url;
  const short_url = shortId.generate();
  console.log("url: ", url);
  console.log("short_url: ", short_url);
  if (!validUrl.isUri(url)) {
    res.json({ error: "invalid url" });
  } else {
    try {
      let findOne = await URL.findOne({
        original_url: url,
      });
      if (findOne) {
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url,
        });
      } else {
        findOne = new URL({
          original_url: url,
          short_url: short_url,
        });
        await findOne.save();
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url,
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json("Server error...");
    }
  }
});

app.get("/api/shorturl/:short_url?", async function (req, res) {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url,
    });
    if (urlParams) {
      return res.redirect(urlParams.original_url);
    } else {
      return res.status(404).json("No URL found");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error...");
  }
});

app.get("/api/whoami", function (req, res) {
  console.log("req: ", req.headers);
  res.json({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

app.get("/api/:date?", function (req, res) {
  let date = req.params.date;
  console.log("date: ", date);
  if (req.params.date === "" || req.params.date === undefined) {
    date = new Date();
  } else {
    if (!isNaN(date)) {
      date = new Date(parseInt(date));
    } else {
      date = new Date(date);
    }
  }
  if (date.toString() === "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    res.json({ unix: date.getTime(), utc: date.toUTCString() });
  }
});

// listen for requests :)
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
