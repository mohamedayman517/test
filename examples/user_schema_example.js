/**
 * مثال على تعديل نموذج المستخدم لدعم تخزين الصور كـ Base64
 * هذا الملف هو مثال توضيحي فقط ولا يجب استخدامه مباشرة
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ["Admin", "Engineer", "Customer"] 
  },
  
  // تعديل حقول الصور لتكون من نوع String لتخزين Base64
  profilePhoto: { 
    type: String, 
    default: "" // يمكن تعيين صورة افتراضية هنا كـ Base64
  },
  
  // صورة بطاقة الهوية للمهندسين
  idCardPhoto: { 
    type: String,
    // مطلوبة فقط للمهندسين
    required: function() {
      return this.role === "Engineer";
    }
  },
  
  // حقول أخرى
  bio: { type: String, default: "" },
  address: { type: String, default: "" },
  specialization: { type: String, default: "" },
  experience: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  bookings: { type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
  createdAt: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

// التحقق من صحة كلمة المرور
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// تشفير كلمة المرور قبل الحفظ
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// إضافة شارة "New Talent" للمهندسين الجدد
userSchema.pre("save", function (next) {
  if (this.isNew && this.role === "Engineer") {
    this.badges = ["New Talent"];
  }
  next();
});

// تحويل الوثيقة إلى JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password; // حذف كلمة المرور من الناتج
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;