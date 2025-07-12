const { body, validationResult } = require("express-validator");
const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Setup multer storage (مؤقت فقط)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // مكان مؤقت للتخزين
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // حد أقصى 5 ميجابايت
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: Images Only!");
    }
  },
});

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
  body("bio")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Bio must be less than 1000 characters"),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { Name, email, password, phone, bio } = req.body;

      // فحص الإيميل في كلا النموذجين لمنع التكرار
      console.log("🔍 [Customer Registration] Checking email:", email);
      const existingUser = await User.findOne({ email });
      const existingClient = await Client.findOne({ email });

      console.log(
        "👤 [Customer Registration] Existing User:",
        existingUser ? "Found" : "Not found"
      );
      console.log(
        "👥 [Customer Registration] Existing Client:",
        existingClient ? "Found" : "Not found"
      );

      if (existingUser || existingClient) {
        console.log(
          "❌ [Customer Registration] Email already exists, rejecting registration"
        );
        return res.status(400).json({
          success: false,
          message:
            "هذا البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.",
        });
      }

      console.log(
        "✅ [Customer Registration] Email is unique, proceeding with registration"
      );

      // Generate a unique customId
      const customId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const hashedPassword = await bcrypt.hash(password, 10);

      // معالجة صورة البروفايل وتحويلها إلى Base64
      let profilePhotoBase64 = null;
      if (req.files && req.files["profilePhoto"]) {
        const profilePhotoFile = req.files["profilePhoto"][0];
        const imageBuffer = fs.readFileSync(profilePhotoFile.path);
        const base64Image = imageBuffer.toString("base64");
        profilePhotoBase64 = `data:${profilePhotoFile.mimetype};base64,${base64Image}`;

        // حذف الملف المؤقت بعد التحويل
        fs.unlinkSync(profilePhotoFile.path);
      }

      // Create user object with basic fields
      const userObj = {
        name: Name,
        email,
        password: hashedPassword,
        phone,
        customId,
        bio,
      };

      // إضافة صورة البروفايل كـ Base64
      userObj.profilePhoto = profilePhotoBase64 || "/uploads/default.png";

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
