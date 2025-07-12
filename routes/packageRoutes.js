const express = require("express");
const router = express.Router();
const Package = require("../models/packageSchema");
const User = require("../models/userSchema");

// Create multiple packages
router.post("/add-packages", async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    const { occasionType, packages } = req.body;

    // Validation
    if (!occasionType || !packages || !Array.isArray(packages)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    // Check package limit (4 packages per engineer)
    const existingCount = await Package.countDocuments({
      engID: req.session.user.id,
      eventType: occasionType,
    });
    if (existingCount + packages.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Maximum package limit reached (3 packages per occasion)",
      });
    }

    // Prepare packages for insertion
    const packagesToInsert = packages.map((pkg) => ({
      engID: req.session.user.id,
      name: pkg.name,
      description: pkg.description || `${pkg.name} Package`,
      price: parseFloat(pkg.price),
      eventType: occasionType,
      essentialItems: pkg.services.filter((s) => s.trim()),
    }));

    // Insert packages
    const result = await Package.insertMany(packagesToInsert);

    res.json({
      success: true,
      message: "Packages created successfully",
      packages: result,
    });
  } catch (error) {
    console.error("Error creating packages:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get engineer's packages
router.get("/engineer/:engID", async (req, res) => {
  try {
    const packages = await Package.find({ engID: req.params.engID });
    res.json({ success: true, packages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// جلب كل المهندسين مع باكدجاتهم لمناسبة معينة
// جلب كل المهندسين مع باكدجاتهم لمناسبة معينة
router.get("/by-occasion", async (req, res) => {
  try {
    const occasion = req.query.occasion;
    if (!occasion) return res.status(400).send("Occasion is required");

    // جلب المهندسين الذين لديهم التخصص المطلوب (فلترة case-insensitive)
    const engineers = await User.find({
      role: "Engineer",
      isApproved: true, // فقط المهندسين المعتمدين
      isVerified: true, // فقط المهندسين المؤكدين
      specialties: { $in: [new RegExp(`^${occasion}$`, "i")] }, // فلترة case-insensitive
    });

    // جلب الباكدجات الخاصة بالمناسبة
    const packages = await Package.find({ eventType: occasion });

    // ربط كل مهندس بالباكدجات الخاصة به لهذه المناسبة (إن وجدت)
    const engineersWithPackages = engineers.map((engineer) => {
      const engineerPackages = packages.filter(
        (pkg) => pkg.engID.toString() === engineer._id.toString()
      );
      return {
        ...engineer.toObject(),
        packages: engineerPackages,
        hasPackages: engineerPackages.length > 0, // إضافة علامة إذا كان لديه باكدجات أم لا
      };
    });

    // إرسال البيانات للواجهة الأمامية (eng.ejs)
    res.render("eng", {
      engineers: engineersWithPackages,
      occasion,
      user: req.session && req.session.user ? req.session.user : null,
    });
  } catch (err) {
    console.error("Error in /by-occasion:", err);
    res.status(500).send("Server Error");
  }
});

// Get single package by ID
router.get("/:id", async (req, res) => {
  try {
    const package = await Package.findById(req.params.id);
    if (!package) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }
    res.json({ success: true, package });
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update a package
router.put("/:id", async (req, res) => {
  try {
    const { name, description, price, essentialItems } = req.body;

    // Validate input - all fields are required
    if (
      !name ||
      !description ||
      !price ||
      !essentialItems ||
      !Array.isArray(essentialItems)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: name, description, price, and essentialItems",
      });
    }

    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price: parseFloat(price),
        essentialItems: essentialItems.filter((item) => item.trim()),
      },
      { new: true }
    );

    if (!updatedPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, package: updatedPackage });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete a package
router.delete("/:id", async (req, res) => {
  try {
    const deletedPackage = await Package.findByIdAndDelete(req.params.id);

    if (!deletedPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
