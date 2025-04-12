const express = require("express");
const router = express.Router();

const Client = require("../models/clientSchema");
const User = require("../models/userSchema");
const multer = require("multer");
const path = require("path");
const Joi = require("joi");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  }
});

router.get("/userprofile/:id", async (req, res) => {
  try {
    const userID = req.params.id;
    let userData = null;

    // Try to find user in Client model first
    userData = await Client.findOne({ _id: userID }).lean();
    
    // If not found in Client, try User model
    if (!userData) {
      userData = await User.findOne({ _id: userID }).lean();
    }

    if (!userData) {
      return res.status(404).send("User not found");
    }

    // Ensure the profile photo path is correct
    if (userData.profilePhoto && !userData.profilePhoto.startsWith('/uploads/')) {
      userData.profilePhoto = '/uploads/' + userData.profilePhoto;
    }

    res.render("userProfile", {
      userData,
      user: req.session.user || null
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Server error");
  }
});

router.post("/updateProfile", upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const { name, bio } = req.body;
    const userId = req.session.user.id;
    let user = null;

    // Try to find user in Client model first
    user = await Client.findById(userId);
    
    // If not found in Client, try User model
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update user data
    if (user instanceof Client) {
      user.name = name || user.name;
    } else {
      user.firstName = name || user.firstName;
    }
    user.bio = bio || user.bio;

    // Handle profile photo upload
    if (req.file) {
      user.profilePhoto = '/uploads/' + req.file.filename;
    }

    await user.save();

    // Update session with new user data
    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user instanceof Client ? user.name : user.firstName
    };

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        name: user instanceof Client ? user.name : user.firstName,
        bio: user.bio,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
});

module.exports = router;
