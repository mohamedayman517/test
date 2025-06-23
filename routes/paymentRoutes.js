const express = require("express");
const router = express.Router();
const Project = require("../models/projectSchema");
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(null, "profile-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });



router.get("/payment", async (req, res) => {
  const clientUser = req.session.user;
  if (!clientUser) {
    return res.redirect('/');
  }
  res.render("payment", {
    client: clientUser,
    user: clientUser,
    isAuthenticated: !!clientUser,
  });
});



module.exports = router;
