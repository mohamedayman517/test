/**
 * مثال على تنفيذ تحويل الصور إلى Base64 مع ضغط الصور في مسار المشاريع
 * هذا الملف هو مثال توضيحي فقط ولا يجب استخدامه مباشرة
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp"); // تأكد من تثبيت مكتبة sharp: npm install sharp
const Project = require("../models/projectSchema");

// إعداد التخزين المؤقت للملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// تكوين multer مع التحقق من نوع الملف
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // حد أقصى 10 ميجابايت
  fileFilter: (req, file, cb) => {
    // قبول الصور فقط
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'), false);
    }
  }
});

// ✅ إنشاء مشروع جديد مع ضغط الصورة
router.post("/create", upload.single("projectImage"), async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "يرجى تسجيل الدخول لإنشاء مشاريع.",
      });
    }

    const { projectName, projectType, projectArea, projectPrice } = req.body;
    if (!projectName || !projectType || !projectArea || !projectPrice || !req.file) {
      return res
        .status(400)
        .json({ success: false, message: "جميع الحقول مطلوبة." });
    }

    const area = parseFloat(projectArea);
    const price = parseFloat(projectPrice);

    if (isNaN(area) || area <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "مساحة المشروع غير صالحة." });
    }
    if (isNaN(price) || price <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "سعر المشروع غير صالح." });
    }

    // ضغط الصورة باستخدام sharp
    const compressedImageBuffer = await sharp(req.file.path)
      .resize({ width: 1200, height: 800, fit: 'inside' }) // تغيير حجم الصورة
      .jpeg({ quality: 80 }) // ضغط الصورة بجودة 80%
      .toBuffer();

    // تحويل الصورة المضغوطة إلى Base64
    const base64Image = compressedImageBuffer.toString("base64");
    const imageData = `data:image/jpeg;base64,${base64Image}`;

    // إنشاء مشروع جديد
    const newProject = new Project({
      name: projectName,
      engID: req.session.user.id,
      image: imageData,
      price: price,
      type: projectType,
      area: area,
    });

    await newProject.save();
    
    // حذف الملف المؤقت
    fs.unlinkSync(req.file.path);
    
    res.json({ success: true, message: "تم إنشاء المشروع بنجاح" });
  } catch (error) {
    console.error("خطأ في حفظ المشروع:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم أثناء حفظ المشروع" });
  }
});

// ✅ تعديل مشروع مع ضغط الصورة
router.put("/:id", upload.single("projectImage"), async (req, res) => {
  try {
    const { projectName, projectType, projectArea, projectPrice } = req.body;

    if (!projectName || !projectType || !projectArea || !projectPrice) {
      return res
        .status(400)
        .json({ success: false, message: "جميع الحقول مطلوبة." });
    }

    const area = parseFloat(projectArea);
    const price = parseFloat(projectPrice);

    if (isNaN(area) || area <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "مساحة المشروع غير صالحة." });
    }
    if (isNaN(price) || price <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "سعر المشروع غير صالح." });
    }

    const updateData = {
      name: projectName,
      type: projectType,
      area: area,
      price: price,
    };

    // إذا تم تحميل صورة جديدة
    if (req.file) {
      // ضغط الصورة باستخدام sharp
      const compressedImageBuffer = await sharp(req.file.path)
        .resize({ width: 1200, height: 800, fit: 'inside' }) // تغيير حجم الصورة
        .jpeg({ quality: 80 }) // ضغط الصورة بجودة 80%
        .toBuffer();

      // تحويل الصورة المضغوطة إلى Base64
      const base64Image = compressedImageBuffer.toString("base64");
      updateData.image = `data:image/jpeg;base64,${base64Image}`;
      
      // حذف الملف المؤقت
      fs.unlinkSync(req.file.path);
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: "لم يتم العثور على المشروع" });
    }

    res.json({ success: true, message: "تم تحديث المشروع بنجاح" });
  } catch (error) {
    console.error("خطأ في تحديث المشروع:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم أثناء تحديث المشروع" });
  }
});

// ✅ عرض مشروع
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "لم يتم العثور على المشروع" });
    }
    res.json({ success: true, project });
  } catch (error) {
    console.error("خطأ في جلب المشروع:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم أثناء جلب المشروع" });
  }
});

// ✅ حذف مشروع
router.delete("/:id", async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) {
      return res.status(404).json({ success: false, message: "لم يتم العثور على المشروع." });
    }
    res.status(200).json({ success: true, message: "تم حذف المشروع بنجاح." });
  } catch (error) {
    console.error("خطأ في حذف المشروع:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم أثناء حذف المشروع." });
  }
});

module.exports = router;