const { body, validationResult } = require("express-validator");
const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const bcrypt = require("bcrypt");
const multer = require("multer");

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

const upload = multer({ storage });

router.get("/registerCustomer", (req, res) => {
  const clientUser = req.session.user;
  res.render("registerCustomer", { user: clientUser });
});

router.post(
  "/registerCustomer",
  upload.fields([{ name: "profilePhoto", maxCount: 1 }]),

  body("email").isEmail().withMessage("Enter a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    ),

  body("Name")
    .notEmpty()
    .withMessage(" Name is required")
    .matches(/^[A-Za-z ]+$/)
    .withMessage(" Name should contain only letters"),

  body("phone")
    .isMobilePhone(["ar-EG", "en-US", "sa", "ae"], { strictMode: false })
    .withMessage("Enter a valid phone number"),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { Name, email, password, phone } = req.body;

      // Check if email already exists
      const existingUser = await Client.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email address",
        });
      }

      // Generate a unique customId
      const customId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const hashedPassword = await bcrypt.hash(password, 10);

      // Handle profile photo path (only for Engineers)
      let profilePhotoPath = null;
      if (req.files && req.files["profilePhoto"]) {
        profilePhotoPath = "/uploads/" + req.files["profilePhoto"][0].filename;
      }

      // Create user object with basic fields
      const userObj = {
        name: Name,
        email,
        password: hashedPassword,
        phone,

        customId,
      };

      // Add engineer-specific fields only if role is Engineer

      userObj.profilePhoto = profilePhotoPath;

      const newUser = new Client(userObj);

      await newUser.save();
      res.status(201).json({
        message: "User registered successfully",
        user: {
          _id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          name: `${newUser.name}`,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error during registration" });
    }
  }
);

module.exports = router;
