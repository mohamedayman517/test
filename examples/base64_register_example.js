/**
 * Example of implementing image conversion to Base64 in user registration route
 * This file is an illustrative example only and should not be used directly
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");
const User = require("../models/userSchema");

// Setup temporary file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Temporary storage location
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maximum 5 MB
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("File must be an image"), false);
    }
  },
});

// Route for registering new user with image upload
router.post(
  "/register",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idCardPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;

      // Validate required data
      if (!name || !email || !password || !role || !phone) {
        return res
          .status(400)
          .json({ success: false, message: "All fields are required" });
      }

      // Check if user with same email doesn't exist
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "Email already in use" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user object
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        phone,
      });

      // Process profile photo if uploaded
      if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
        const profilePhotoFile = req.files.profilePhoto[0];
        const imageBuffer = fs.readFileSync(profilePhotoFile.path);
        const base64Image = imageBuffer.toString("base64");
        newUser.profilePhoto = `data:${profilePhotoFile.mimetype};base64,${base64Image}`;

        // Delete temporary file
        fs.unlinkSync(profilePhotoFile.path);
      }

      // Process ID card photo if uploaded (for engineers only)
      if (
        role === "Engineer" &&
        req.files &&
        req.files.idCardPhoto &&
        req.files.idCardPhoto[0]
      ) {
        const idCardPhotoFile = req.files.idCardPhoto[0];
        const imageBuffer = fs.readFileSync(idCardPhotoFile.path);
        const base64Image = imageBuffer.toString("base64");
        newUser.idCardPhoto = `data:${idCardPhotoFile.mimetype};base64,${base64Image}`;

        // Delete temporary file
        fs.unlinkSync(idCardPhotoFile.path);
      }

      // Save user to database
      await newUser.save();

      // Create session for user
      req.session.user = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      };

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

module.exports = router;
