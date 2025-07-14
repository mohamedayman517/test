# 🚀 Decore & More - Refactor Guide

## 📋 Overview of Improvements

The project has been completely restructured to improve organization, performance, and maintainability. Here's the new structure:

## 🗂️ New Organized Structure

### 📁 **Controllers** - Request Handlers

```
controllers/
├── authController.js      # Authentication and verification
├── userController.js      # User management
├── projectController.js   # Project management
├── packageController.js   # Package management
├── messageController.js   # Messaging system
├── bookingController.js   # Booking management
├── adminController.js     # Admin dashboard
└── healthController.js    # System health checks
```

### 🔧 **Services** - Business Logic Layer

```
services/
├── userService.js         # User business logic
├── projectService.js      # Project business logic
├── packageService.js      # Package business logic
├── messageService.js      # Message business logic
├── adminService.js        # Admin business logic
├── emailService.js        # Email service
└── fileUploadService.js   # File upload service
```

### 🛡️ **Middleware** - الوسطاء

```
middleware/
├── auth.js               # المصادقة والتفويض
├── validation.js         # التحقق من البيانات
├── upload.js            # رفع الملفات
├── errorHandler.js      # معالجة الأخطاء
├── rateLimiter.js       # تحديد معدل الطلبات
└── requestLogger.js     # تسجيل الطلبات
```

### 🛣️ **Routes** - المسارات المنظمة

```
routes/
├── index.js             # المسار الرئيسي
├── api/                 # API Routes
│   ├── index.js         # API الرئيسي
│   ├── auth.js          # مصادقة API
│   ├── users.js         # مستخدمين API
│   ├── projects.js      # مشاريع API
│   ├── packages.js      # باقات API
│   ├── messages.js      # رسائل API
│   ├── bookings.js      # حجوزات API
│   ├── payments.js      # مدفوعات API
│   └── admin.js         # إدارة API
└── web/                 # Web Routes
    ├── index.js         # Web الرئيسي
    ├── public.js        # الصفحات العامة
    ├── auth.js          # صفحات المصادقة
    ├── admin.js         # صفحات الإدارة
    ├── engineer.js      # صفحات المهندس
    └── client.js        # صفحات العميل
```

### 🔧 **Utils** - الأدوات المساعدة

```
utils/
├── ErrorHandler.js      # معالج الأخطاء المخصص
├── ResponseHandler.js   # معالج الاستجابات
├── Logger.js           # نظام السجلات
├── emailTransporter.js # ناقل البريد الإلكتروني
└── monitoring.js       # المراقبة
```

## ✨ **المميزات الجديدة**

### 🔐 **نظام مصادقة محسن**

- تحقق متعدد الطبقات
- إدارة جلسات محسنة
- تحقق من صحة المستخدم في الوقت الفعلي
- دعم أدوار متعددة (Admin, Engineer, User)

### 📊 **نظام تسجيل متقدم**

- تسجيل مفصل للأحداث
- مراقبة الأداء
- تتبع الأخطاء
- إحصائيات الاستخدام

### 🚀 **تحسينات الأداء**

- Redis للتخزين المؤقت
- نظام الطوابير للمهام الثقيلة
- ضغط الصور التلقائي
- تحسين استعلامات قاعدة البيانات

### 🛡️ **أمان متقدم**

- تحديد معدل الطلبات
- تنظيف البيانات
- حماية من CSRF
- تشفير متقدم

## 🔄 **كيفية الاستخدام**

### 1. **API Endpoints**

```javascript
// Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

// Users
GET /api/users/engineers
GET /api/users/profile/:userId
PUT /api/users/profile/:userId

// Projects
GET /api/projects
POST /api/projects
GET /api/projects/:projectId

// Packages
GET /api/packages
POST /api/packages
GET /api/packages/event-type/:eventType
```

### 2. **Web Routes**

```javascript
// Public Pages
GET /                    # الصفحة الرئيسية
GET /engineers          # قائمة المهندسين
GET /projects           # معرض المشاريع

// Authentication
GET /login              # صفحة تسجيل الدخول
GET /register           # صفحة التسجيل

// Dashboards
GET /admin/dashboard    # لوحة الإدارة
GET /engineer/dashboard # لوحة المهندس
GET /client/dashboard   # لوحة العميل
```

## 🔧 **استخدام Services**

### مثال على UserService:

```javascript
const UserService = require("../services/userService");

// إنشاء مستخدم جديد
const newUser = await UserService.createUser(userData);

// البحث عن مستخدم
const user = await UserService.findUserById(userId);

// تحديث مستخدم
const updatedUser = await UserService.updateUser(userId, updateData);
```

### مثال على EmailService:

```javascript
const EmailService = require("../services/emailService");

// إرسال بريد تحقق
await EmailService.sendVerificationEmail(email, code, userName);

// إرسال بريد إعادة تعيين كلمة المرور
await EmailService.sendPasswordResetEmail(email, resetCode, userName);
```

## 🛡️ **استخدام Middleware**

### Authentication:

```javascript
const {
  requireAuth,
  requireAdmin,
  requireEngineer,
} = require("../middleware/auth");

// يتطلب تسجيل دخول
router.get("/protected", requireAuth, controller);

// يتطلب صلاحيات إدارية
router.get("/admin-only", requireAuth, requireAdmin, controller);

// يتطلب أن يكون مهندس
router.post("/create-project", requireAuth, requireEngineer, controller);
```

### Validation:

```javascript
const {
  validateUserRegistration,
  validateProjectCreation,
} = require("../middleware/validation");

// تحقق من بيانات التسجيل
router.post("/register", validateUserRegistration, controller);

// تحقق من بيانات المشروع
router.post("/projects", validateProjectCreation, controller);
```

### File Upload:

```javascript
const { uploadConfigs } = require("../middleware/upload");

// رفع صورة واحدة
router.post("/upload", uploadConfigs.singleImage, controller);

// رفع ملفات متعددة
router.post("/register", uploadConfigs.userRegistration, controller);
```

## 📈 **مراقبة النظام**

### Health Check:

```
GET /health
GET /api/health
```

### Logs:

- جميع الطلبات يتم تسجيلها
- الأخطاء يتم تتبعها
- الأداء يتم مراقبته

## 🔄 **Migration من النظام القديم**

1. **Controllers**: تم نقل المنطق من Routes إلى Controllers منفصلة
2. **Services**: تم إنشاء طبقة خدمات لمنطق الأعمال
3. **Middleware**: تم تنظيم وتحسين جميع الـ middleware
4. **Routes**: تم تقسيم Routes إلى API و Web منفصلة
5. **Error Handling**: نظام معالجة أخطاء موحد ومحسن

## 🚀 **الخطوات التالية**

1. **اختبار النظام الجديد**
2. **إضافة المزيد من الاختبارات**
3. **تحسين الأداء**
4. **إضافة المزيد من الميزات**

## 📞 **الدعم**

إذا واجهت أي مشاكل مع النظام الجديد، تحقق من:

1. Logs في console
2. ملفات الأخطاء
3. Health check endpoints
4. Database connections

---

**تم إنجاز Refactor بنجاح! 🎉**

النظام الآن أكثر تنظيماً وأماناً وقابلية للصيانة.
