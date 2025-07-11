/**
 * مثال على تنفيذ تحويل الصور إلى Base64 في مسار تسجيل المستخدمين
 * هذا الملف هو مثال توضيحي فقط ولا يجب استخدامه مباشرة
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");
const User = require("../models/userSchema");

// إعداد التخزين المؤقت للملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // مكان مؤقت للتخزين
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// تكوين multer
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حد أقصى 5 ميجابايت
  fileFilter: (req, file, cb) => {
    // قبول الصور فقط
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'), false);
    }
  }
});

// مسار تسجيل مستخدم جديد مع تحميل صورة
router.post("/register", upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'idCardPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });
    }

    // التحقق من عدم وجود مستخدم بنفس البريد الإلكتروني
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء كائن المستخدم الجديد
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
    });

    // معالجة صورة الملف الشخصي إذا تم تحميلها
    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      const profilePhotoFile = req.files.profilePhoto[0];
      const imageBuffer = fs.readFileSync(profilePhotoFile.path);
      const base64Image = imageBuffer.toString("base64");
      newUser.profilePhoto = `data:${profilePhotoFile.mimetype};base64,${base64Image}`;
      
      // حذف الملف المؤقت
      fs.unlinkSync(profilePhotoFile.path);
    }

    // معالجة صورة بطاقة الهوية إذا تم تحميلها (للمهندسين فقط)
    if (role === "Engineer" && req.files && req.files.idCardPhoto && req.files.idCardPhoto[0]) {
      const idCardPhotoFile = req.files.idCardPhoto[0];
      const imageBuffer = fs.readFileSync(idCardPhotoFile.path);
      const base64Image = imageBuffer.toString("base64");
      newUser.idCardPhoto = `data:${idCardPhotoFile.mimetype};base64,${base64Image}`;
      
      // حذف الملف المؤقت
      fs.unlinkSync(idCardPhotoFile.path);
    }

    // حفظ المستخدم في قاعدة البيانات
    await newUser.save();

    // إنشاء جلسة للمستخدم
    req.session.user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };

    res.status(201).json({ 
      success: true, 
      message: "تم تسجيل المستخدم بنجاح", 
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      }
    });
  } catch (error) {
    console.error("خطأ في تسجيل المستخدم:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

module.exports = router;