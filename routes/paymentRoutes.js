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

// عرض صفحة الدفع
router.get("/payment", (req, res) => {
  const { engineerId, projectId } = req.query;
  const clientUser = req.session.user;
  res.render("payment", { 
    engineerId, 
    projectId, 
    user: clientUser,
    isAuthenticated: !!clientUser 
  });
});

// معالجة تسجيل الدخول
router.post("/payment/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Client.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid password" });
    }

    req.session.user = user;
    res.json({ 
      success: true, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// معالجة التسجيل
router.post("/payment/register", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { name, email, password, phone, bio } = req.body;
    
    // Check if user already exists
    const existingUser = await Client.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already exists" 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new Client({
      name,
      email,
      password: hashedPassword,
      phone,
      bio,
      role: "user",
      profilePhoto: req.file ? `/uploads/${req.file.filename}` : "/uploads/default.png"
    });

    await newUser.save();
    req.session.user = newUser;

    res.json({ 
      success: true, 
      user: { 
        _id: newUser._id, 
        name: newUser.name, 
        email: newUser.email,
        profilePhoto: newUser.profilePhoto
      } 
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// معالجة الدفع
router.post("/payment", async (req, res) => {
  try {
    const { fullName, paymentMethod, engineerId, projectId, phone } = req.body;

    if (!fullName || !paymentMethod || !engineerId || !projectId || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All Fields Required" });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project Not Found" });
    }

    const engineer = await User.findOne({ _id: engineerId });
    if (!engineer) {
      return res
        .status(404)
        .json({ success: false, message: "Engineer Not Found" });
    }

    engineer.bookings.push({
      clientName: fullName,
      phone: phone,
      projectType: project.type,
      paymentMethod: paymentMethod,
      date: moment().toISOString(),
      status: "Active",
    });

    await engineer.save();

    return res.json({
      success: true,
      message: "Payment Successful!",
      engineerId,
    });
  } catch (error) {
    console.error("Payment error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
