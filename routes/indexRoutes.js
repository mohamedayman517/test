const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");

router.get("/", async (req, res) => {
  // التحقق من وجود مستخدم مسجل الدخول
  if (req.session && req.session.user) {
    // إذا كان المستخدم مهندسًا، توجيهه إلى صفحة البروفايل الخاصة به
    if (req.session.user.role === "Engineer") {
      return res.redirect(`/profile/${req.session.user.id}`);
    }
    // إذا كان المستخدم مسؤولًا، توجيهه إلى لوحة التحكم
    else if (req.session.user.role === "Admin") {
      return res.redirect("/AdminDashboard");
    }
    // إذا كان المستخدم عاديًا، عرض الصفحة الرئيسية مع بيانات المستخدم
  }

  // إذا لم يكن هناك مستخدم مسجل الدخول أو كان مستخدمًا عاديًا، عرض الصفحة الرئيسية
  const engineers = await User.find({ role: "Engineer" }).lean();
  res.render("index", { engineers, user: req.session.user || null });
});

module.exports = router;
