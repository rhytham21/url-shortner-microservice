require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dns = require("dns");
const urlParser = require("url");

// Database Configuration
const DB_URI = "mongodb://127.0.0.1:27017/urlShortener"; // Local MongoDB URI

mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database connected successfully."))
  .catch((err) => console.error("Database connection error:", err));

const ShortURL = mongoose.model("ShortUrl", {
  original_url: String,
  short_url: Number,
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

let id = 1;
ShortURL.find()
  .countDocuments()
  .then((numberOfDocs) => (id = numberOfDocs + 1))
  .catch((err) => console.log(err));

// Clear the database
app.get("/api/clear", async (req, res) => {
  await ShortURL.deleteMany({});
  id = 1;
  res.send("All records deleted.");
});

// Create a shortened URL
app.post("/api/shorturl", (req, res) => {
  const url = req.body.url;

  dns.lookup(urlParser.parse(url).hostname, async (err, address) => {
    if (!address) {
      res.json({ error: "Invalid URL" });
    } else {
      try {
        const { original_url, short_url } = await ShortURL.create({
          original_url: url,
          short_url: id++,
        });
        res.json({ original_url, short_url });
      } catch (err) {
        res.status(500).json({ error: "Failed to create shortened URL" });
      }
    }
  });
});

// Redirect to the original URL
app.get("/api/shorturl/:id", async (req, res) => {
  try {
    const record = await ShortURL.findOne({ short_url: +req.params.id });
    if (!record) {
      res.json({ error: "URL not found" });
    } else {
      res.redirect(record.original_url);
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Start the server
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
