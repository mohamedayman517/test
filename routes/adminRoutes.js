const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");


// Admin Dashboard
router.get("/AdminDashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Admin") {
      return res.status(403).send("Access denied. Admins only.");
    }
    const engineers = await User.find({ role: "Engineer" }).lean();
    res.render("AdminDashboard", { engineers });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Delete Engineer
router.delete("/AdminDashboard/engineers/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Admin") {
      return res.status(403).send("Access denied. Admins only.");
    }
    const engineerId = req.params.id;
    const deletedEngineer = await User.findByIdAndDelete(engineerId);
    if (!deletedEngineer) {
      return res.status(404).send("Engineer not found.");
    }
    res.status(200).json({ message: "Engineer deleted successfully." });
  } catch (error) {
    console.error("Error deleting engineer:", error);
    res.status(500).send("Server error while deleting engineer.");
  }
});

router.post("/approve-engineer", async (req, res) => {
  const { email } = req.body;

  // البحث عن المهندس
  const engineer = await User.findOne({ email, role: "Engineer" });
  if (!engineer) {
      return res.status(404).json({ message: "لم يتم العثور على المهندس." });
  }

  // تحديث حالة الموافقة
  engineer.isApproved = true;
  await engineer.save();

  res.json({ message: "تمت الموافقة على المهندس بنجاح، يمكنه الآن تسجيل الدخول." });
});


router.get("/pending-engineers", async (req, res) => {
  const pendingEngineers = await User.find({ role: "Engineer", isApproved: false }).select("firstName lastName email idCardPhoto");
  res.json(pendingEngineers);
});


router.post("/reject-engineer", async (req, res) => {
  try {
      if (!req.session.user || req.session.user.role !== "Admin") {
          return res.status(403).json({ message: "غير مسموح لك بالوصول" });
      }

      const { email } = req.body;
      const engineer = await User.findOne({ email, role: "Engineer" });

      if (!engineer) {
          return res.status(404).json({ message: "لم يتم العثور على المهندس." });
      }

      // حذف المهندس من قاعدة البيانات
      await User.deleteOne({ email });

      res.json({ message: "تم رفض المهندس بنجاح وحذفه من القائمة." });
  } catch (error) {
      console.error("❌ خطأ أثناء رفض المهندس:", error);
      res.status(500).json({ message: "حدث خطأ أثناء رفض المهندس." });
  }
});



module.exports = router;
