const { body, validationResult } = require("express-validator");
const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");
const bcrypt = require("bcrypt");
const multer = require("multer");
const passport = require("passport");
const nodemailer = require("nodemailer");

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




const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

router.get("/login", (req, res) =>{
  const clientUser = req.session.user
   res.render("login", { title: "Login" , user:clientUser })});
router.get("/register", (req, res) =>{
  const clientUser = req.session.user
   res.render("register",{user:clientUser})
});
router.post(
  "/register",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idCardPhoto", maxCount: 1 }
  ]),

  body("email").isEmail().withMessage("Enter a valid email address"),
  body("password")
  .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
  .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"),
  body("confirmPassword")
  .custom((value, { req }) => value === req.body.password)
  .withMessage("Passwords do not match"),
  body("firstName")
  .notEmpty().withMessage("First name is required")
  .isAlpha().withMessage("First name should contain only letters"),
body("lastName")
  .notEmpty().withMessage("Last name is required")
  .isAlpha().withMessage("Last name should contain only letters"),
  body("phone")
  .isMobilePhone(["ar-EG", "en-US", "sa", "ae"], { strictMode: false })
  .withMessage("Enter a valid phone number"),

  body("role").isIn(["Admin", "User", "Engineer"]).withMessage("Invalid role"),
  body("termsAccepted").equals("true").withMessage("You must accept the terms"),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, password, phone, role } = req.body;
      
      // Generate a unique customId
      const customId = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

      const hashedPassword = await bcrypt.hash(password, 10);

      // Handle profile photo path
      let profilePhotoPath = null;
      if (req.files["profilePhoto"]) {
        profilePhotoPath = "/uploads/" + req.files["profilePhoto"][0].filename;
      }

      // Handle ID card photo path
      let idCardPhotoPath = null;
      if (req.files["idCardPhoto"]) {
        idCardPhotoPath = "/uploads/" + req.files["idCardPhoto"][0].filename;
      }

      const newUser = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role,
        customId,
        profilePhoto: profilePhotoPath,
        idCardPhoto: idCardPhotoPath
      });

      await newUser.save();
      res.status(201).json({ message: "User registered successfully", customId });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error during registration" });
    }
  }
);

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Only check approval for Engineers
        if (user.role === 'Engineer' && !user.isApproved) {
            return res.status(403).json({ message: 'Your account is pending approval' });
        }

        // Set user session
        req.session.user = {
            id: user._id,
            email: user.email,
            role: user.role,
            name: `${user.firstName} ${user.lastName}`
        };

        // Determine redirect path based on role
        let redirectPath;
    if (user.role === "Engineer") {
      redirectPath = `/profile/${user._id}`;
    } else if (user.role === "Admin") {
      redirectPath = "/AdminDashboard";
    } else {
      redirectPath = "/";
    }

        res.json({ 
            message: 'Login successful',
            redirectPath: redirectPath
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get("/get-current-user", (req, res) => {
  console.log("الجلسة الحالية:", req.session);
  if (req.session && req.session.user) {
    res.json({ userId: req.session.user._id });
  } else {
    res.status(401).json({ message: "User not logged in" });
  }
});

router.get("/forgetPassword", (req, res) => {
  res.render("forgetPassword", { message: null });
});

router.post("/forgetPassword", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "❌ Email is not registered" }); 
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000);
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL, 
      to: email,
      subject: "Password Reset Code",
      text: `كود التأكيد: ${resetCode}`,
    });

    res.json({ message: "✅ The code has been sent to your email" });
  } catch (error) {
    console.error("❌ Error while sending email:", error);
    res
      .status(500)
      .json({ message: "❌ Something went wrong, please try again" });
  }
});


router.get("/verifyCode", (req, res) => {
  res.render("verifyCode", { email: req.query.email, message: null });
});


router.post("/verifyCode", async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "❌ User not found" });
    }

    
    if (
      !user.resetCode ||
      user.resetCode !== code ||
      user.resetCodeExpires < Date.now()
    ) {
      return res.status(400).json({ message: "❌ Invalid or expired code" });
    }

    
    res.json({ message: "✅ Code is valid! Redirecting to password reset..." });
  } catch (error) {
    console.error("❌ Error while verifying code:", error);
    res
      .status(500)
      .json({ message: "❌ Something went wrong, please try again" });
  }
});

router.get("/resetPassword", (req, res) => {
  res.render("resetPassword", { email: req.query.email, message: null });
});

router.post("/resetPassword", [

  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"),
],
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "❌ User not found" });
    }

    if (!user.resetCode || user.resetCodeExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "❌ Invalid or expired verification code" });
    }

    
    user.password = await bcrypt.hash(password, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({
      message: "✅ Password has been reset successfully! You can now log in.",
    });
  } catch (error) {
    console.error("❌ Error while resetting password:", error);
    res
      .status(500)
      .json({ message: "❌ Something went wrong, please try again" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.status(200).json({ message: "Logged out" });
  });
});


module.exports = router;
