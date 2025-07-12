const { body, validationResult } = require("express-validator");
const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const bcrypt = require("bcrypt");
const multer = require("multer");
const passport = require("passport");
const nodemailer = require("nodemailer");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

// Setup multer storage (مؤقت فقط)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../uploads/");
    console.log(`✅ Upload directory path: ${dir}`);

    if (!fs.existsSync(dir)) {
      console.log(`⚠️ Upload directory does not exist, creating it now...`);
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created upload directory: ${dir}`);
    } else {
      console.log(`✅ Upload directory exists: ${dir}`);
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + path.extname(file.originalname);
    console.log(`✅ Generated filename for upload: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 },
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

router.get("/login", (req, res) => {
  const clientUser = req.session.user;
  res.render("login", { title: "Login", user: clientUser });
});

router.get("/register", (req, res) => {
  const clientUser = req.session.user;
  res.render("register", { user: clientUser });
});

router.post(
  "/register",
  (req, res, next) => {
    // معالجة أخطاء Multer
    const uploadMiddleware = upload.fields([
      { name: "profilePhoto", maxCount: 1 },
      { name: "idCardPhoto", maxCount: 1 },
    ]);

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // خطأ في Multer
        console.error("❌ Multer error:", err);
        return res.status(400).json({
          success: false,
          message: `خطأ في تحميل الملف: ${err.message}`,
        });
      } else if (err) {
        // خطأ غير معروف
        console.error("❌ Unknown error during file upload:", err);
        return res.status(500).json({
          success: false,
          message: "حدث خطأ أثناء تحميل الملف. يرجى المحاولة مرة أخرى.",
        });
      }

      // تم تحميل الملفات بنجاح، متابعة المعالجة
      next();
    });
  },
  body("email").isEmail().withMessage("Enter a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    ),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isAlpha()
    .withMessage("First name should contain only letters"),
  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isAlpha()
    .withMessage("Last name should contain only letters"),
  body("phone")
    .isMobilePhone(["ar-EG", "en-US", "sa", "ae"], { strictMode: false })
    .withMessage("Enter a valid phone number"),
  body("role").isIn(["Admin", "User", "Engineer"]).withMessage("Invalid role"),
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

      const { firstName, lastName, email, password, phone, role, bio } =
        req.body;

      // فحص الإيميل في كلا النموذجين لمنع التكرار
      console.log("🔍 Checking email:", email);
      const existingUser = await User.findOne({ email });
      const existingClient = await Client.findOne({ email });

      console.log("👤 Existing User:", existingUser ? "Found" : "Not found");
      console.log(
        "👥 Existing Client:",
        existingClient ? "Found" : "Not found"
      );

      if (existingUser || existingClient) {
        console.log("❌ Email already exists, rejecting registration");
        return res.status(400).json({
          success: false,
          message:
            "هذا البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.",
        });
      }

      console.log("✅ Email is unique, proceeding with registration");

      const customId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const hashedPassword = await bcrypt.hash(password, 10);

      let profilePhotoBase64 = null;
      if (req.files && req.files["profilePhoto"]) {
        const profilePhotoFile = req.files["profilePhoto"][0];
        try {
          // تأكد من أن المسار موجود
          console.log("Profile Photo Path:", profilePhotoFile.path);

          // قراءة الملف
          const imageBuffer = await fsPromises.readFile(profilePhotoFile.path);
          const base64Image = imageBuffer.toString("base64");
          profilePhotoBase64 = `data:${profilePhotoFile.mimetype};base64,${base64Image}`;

          // حذف الملف المؤقت بعد تحويله
          await fsPromises.unlink(profilePhotoFile.path);
        } catch (err) {
          console.error("❌ Error reading profile photo:", err);
          // إضافة معلومات إضافية للتصحيح
          console.error("File path:", profilePhotoFile.path);
          console.error("File exists:", fs.existsSync(profilePhotoFile.path));
        }
      }

      let idCardPhotoBase64 = null;
      if (req.files && req.files["idCardPhoto"]) {
        const idCardPhotoFile = req.files["idCardPhoto"][0];
        try {
          // تأكد من أن المسار موجود
          console.log("ID Card Photo Path:", idCardPhotoFile.path);
          console.log(
            "File exists check before reading:",
            fs.existsSync(idCardPhotoFile.path)
          );

          // التحقق من حجم الملف
          const stats = await fsPromises.stat(idCardPhotoFile.path);
          console.log(`✅ ID Card Photo file size: ${stats.size} bytes`);

          // قراءة الملف
          const imageBuffer = await fsPromises.readFile(idCardPhotoFile.path);
          console.log(
            `✅ Successfully read ID Card Photo file, size: ${imageBuffer.length} bytes`
          );

          const base64Image = imageBuffer.toString("base64");
          idCardPhotoBase64 = `data:${idCardPhotoFile.mimetype};base64,${base64Image}`;
          console.log(`✅ ID Card Photo processed successfully`);

          // حذف الملف المؤقت بعد تحويله
          await fsPromises.unlink(idCardPhotoFile.path);
          console.log(`✅ Temporary ID Card Photo file deleted`);
        } catch (err) {
          console.error("❌ Error reading ID card photo:", err);
          // إضافة معلومات إضافية للتصحيح
          console.error("File path:", idCardPhotoFile.path);
          console.error("File exists:", fs.existsSync(idCardPhotoFile.path));
          console.error(
            "Directory contents:",
            fs.readdirSync(path.dirname(idCardPhotoFile.path))
          );

          return res.status(400).json({
            success: false,
            message:
              "حدث خطأ أثناء معالجة صورة بطاقة الهوية. يرجى المحاولة مرة أخرى.",
          });
        }
      }

      let specialtiesArr = [];
      if (req.body.specialties) {
        specialtiesArr = Array.isArray(req.body.specialties)
          ? req.body.specialties
          : [req.body.specialties];
      }

      const userObj = {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role,
        customId,
        bio,
        isApproved:
          role === "Admin" ? true : role === "Engineer" ? false : true,
        isVerified: false,
        hasPaidSubscription: false,
        specialties: specialtiesArr,
      };

      if (role === "Engineer") {
        userObj.profilePhoto = profilePhotoBase64 || "/uploads/default.png";
        // تأكد من أن صورة بطاقة الهوية موجودة للمهندسين
        if (!idCardPhotoBase64) {
          return res.status(400).json({
            success: false,
            message: "صورة بطاقة الهوية مطلوبة للمهندسين",
          });
        }

        // تسجيل معلومات إضافية للتصحيح
        console.log("✅ ID Card Photo processed successfully");
        userObj.idCardPhoto = idCardPhotoBase64;
      } else {
        if (profilePhotoBase64) {
          userObj.profilePhoto = profilePhotoBase64;
        }
      }

      const newUser = new User(userObj);
      await newUser.save();

      res.status(201).json({
        message: "User registered successfully",
        user: {
          _id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          name: `${newUser.firstName} ${newUser.lastName}`,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error during registration" });
    }
  }
);

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const user2 = await Client.findOne({ email });

    if (!user && !user2) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    let isMatch = false;
    let activeUser = null;
    let userType = "";

    // Check if user exists in User model (Engineer/Admin)
    if (user) {
      isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        activeUser = user;
        userType = "engineer";

        // Only check approval for Engineers
        if (user.role === "Engineer" && !user.isApproved) {
          return res
            .status(403)
            .json({ message: "Your account is pending approval" });
        }

        // Check email verification for Engineers
        if (user.role === "Engineer" && !user.isVerified) {
          return res.status(403).json({
            message:
              "Please verify your email address using the code sent to your email before logging in.",
          });
        }
      }
    }

    // If not matched with User model, try Client model
    if (!isMatch && user2) {
      isMatch = await bcrypt.compare(password, user2.password);
      if (isMatch) {
        activeUser = user2;
        userType = "client";
      }
    }

    // If no match found in either model
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Set session based on user type
    if (userType === "engineer") {
      req.session.user = {
        id: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        name: `${activeUser.firstName} ${activeUser.lastName}`,
      };
    } else if (userType === "client") {
      req.session.user = {
        id: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        name: activeUser.name,
      };
    }

    // Determine redirect path based on role
    let redirectPath;
    if (userType === "engineer") {
      if (activeUser.role === "Engineer") {
        redirectPath = `/profile/${activeUser._id}`;
      } else if (activeUser.role === "Admin") {
        redirectPath = "/AdminDashboard";
      } else if (activeUser.role === "user") {
        redirectPath = "/"; // Regular users go to home page
      } else {
        redirectPath = "/";
      }
    } else if (userType === "client") {
      redirectPath = "/"; // Clients go to home page
    } else {
      redirectPath = "/";
    }

    res.json({
      message: "Login successful",
      redirectPath: redirectPath,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
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

router.post(
  "/resetPassword",
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
      ),
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
  }
);

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.status(200).json({ message: "Logged out" });
  });
});

module.exports = router;
