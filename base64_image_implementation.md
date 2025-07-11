# دليل تنفيذ تخزين الصور كـ Base64 في MongoDB

## نظرة عامة
هذا الدليل يشرح كيفية تطبيق تخزين الصور كـ Base64 في قاعدة بيانات MongoDB لمشروع "Decor And More". هذا النهج يضمن أن الصور ستكون متاحة لجميع أعضاء الفريق بغض النظر عن الجهاز الذي يعملون عليه.

## الملفات التي تحتاج إلى تعديل

### 1. ملفات المسارات (Routes)
يجب تعديل جميع ملفات المسارات التي تتعامل مع تحميل الصور:

- ✅ `projectRoutes.js` (تم تنفيذه بالفعل)
- `userProfileRoutes.js`
- `registerCustomerRoutes.js`
- أي ملفات مسارات أخرى تتعامل مع تحميل الصور

### 2. نماذج البيانات (Schemas)
تأكد من أن جميع نماذج البيانات التي تخزن الصور تستخدم حقل من نوع String:

- ✅ `projectSchema.js` (تم تنفيذه بالفعل)
- `userSchema.js`
- `clientSchema.js`
- أي نماذج أخرى تخزن الصور

## خطوات التنفيذ

### 1. تعديل ملفات المسارات

فيما يلي مثال على كيفية تعديل ملف مسار لتحويل الصور إلى Base64 وتخزينها في قاعدة البيانات:

#### مثال: تعديل `userProfileRoutes.js`

```javascript
// استيراد المكتبات اللازمة
const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const User = require("../models/userSchema");

// إعداد التخزين المؤقت للملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // مكان مؤقت
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// مسار تحديث صورة الملف الشخصي
router.post("/update-profile-photo", upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "لم يتم تحميل أي صورة" });
    }

    // قراءة الملف وتحويله إلى Base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    // تحديث صورة المستخدم في قاعدة البيانات
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      { profilePhoto: imageData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "لم يتم العثور على المستخدم" });
    }

    // حذف الملف المؤقت بعد الانتهاء
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: "تم تحديث صورة الملف الشخصي بنجاح" });
  } catch (error) {
    console.error("خطأ في تحديث صورة الملف الشخصي:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// باقي المسارات...

module.exports = router;
```

### 2. تعديل نماذج البيانات

تأكد من أن نماذج البيانات تستخدم حقل من نوع String لتخزين الصور:

#### مثال: تعديل `userSchema.js`

```javascript
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // حقول أخرى...
  
  // تعديل حقل الصورة ليكون من نوع String
  profilePhoto: { type: String, default: "" }, // لتخزين الصورة كـ Base64
  idCardPhoto: { type: String }, // لتخزين صورة بطاقة الهوية كـ Base64
  
  // حقول أخرى...
});

// باقي الكود...

const User = mongoose.model("User", userSchema);

module.exports = User;
```

### 3. تعديل واجهة المستخدم

تأكد من أن جميع الصفحات التي تعرض الصور تستخدم قيمة الحقل مباشرة في خاصية `src`:

#### مثال: تعديل ملف `profile.ejs`

```html
<!-- قبل التعديل -->
<img src="/uploads/<%= user.profilePhoto %>" alt="صورة الملف الشخصي" />

<!-- بعد التعديل -->
<img src="<%= user.profilePhoto %>" alt="صورة الملف الشخصي" />
```

## اختبار التنفيذ

بعد تنفيذ التغييرات، يجب اختبار الوظائف التالية:

1. **تحميل الصور**: تأكد من أن تحميل الصور يعمل بشكل صحيح وأنها تُخزن في قاعدة البيانات كـ Base64.
2. **عرض الصور**: تأكد من أن الصور تظهر بشكل صحيح في جميع صفحات التطبيق.
3. **تحديث الصور**: تأكد من أن تحديث الصور يعمل بشكل صحيح.

## ملاحظات إضافية

### تحسين الأداء

- **ضغط الصور**: يمكنك استخدام مكتبات مثل `sharp` لضغط الصور وتقليل حجمها قبل تحويلها إلى Base64:

```javascript
const sharp = require("sharp");

// داخل مسار API
const compressedImageBuffer = await sharp(req.file.path)
  .resize(800) // تعيين العرض الأقصى
  .jpeg({ quality: 80 }) // ضغط الصورة بجودة 80%
  .toBuffer();

const base64Image = compressedImageBuffer.toString("base64");
```

- **تخزين مؤقت للصور**: يمكنك استخدام تقنيات التخزين المؤقت في المتصفح لتحسين أداء تحميل الصور المتكررة.

### التعامل مع الصور الكبيرة

إذا كنت تتعامل مع صور كبيرة أو عدد كبير من الصور، فكر في البدائل التالية:

1. **استخدام GridFS**: إذا كانت الصور أكبر من 16 ميجابايت، استخدم GridFS لتخزينها في MongoDB.
2. **خدمات تخزين سحابية**: فكر في استخدام خدمات مثل AWS S3 أو Cloudinary لتخزين الصور.

## الخلاصة

باتباع هذا الدليل، ستتمكن من تنفيذ تخزين الصور كـ Base64 في قاعدة بيانات MongoDB لمشروع "Decor And More". هذا سيضمن أن الصور متاحة لجميع أعضاء الفريق بغض النظر عن الجهاز الذي يعملون عليه.