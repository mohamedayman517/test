// 🔁 userProfileRoutes.js (كامل بعد التعديل لتخزين الصور كـ base64)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Joi = require("joi");

const Client = require("../models/clientSchema");
const User = require("../models/userSchema");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // التأكد من وجود المجلد
    const dir = "./uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir); // مكان مؤقت
  },
  filename: function (req, file, cb) {
    cb(null, "profile-" + Date.now() + path.extname(file.originalname));
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

const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.user) {
    const userId = req.session.user._id || req.session.user.id;
    let user = await User.findById(userId);
    if (!user) user = await Client.findById(userId);

    if (user) {
      return next();
    } else {
      req.session.destroy(() => {
        return res.redirect("/login?message=Your account has been deleted.");
      });
    }
  } else {
    res.status(401).json({ error: "Unauthorized: Please log in." });
  }
};

router.get("/userProfile", async (req, res) => {
  try {
    const userID = req.session.user?._id;
    if (!userID) return res.redirect("/login");

    let userData = await Client.findOne({ _id: userID }).lean();
    if (!userData) userData = await User.findOne({ _id: userID }).lean();
    if (!userData) return res.status(404).send("User not found");

    res.render("userProfile", {
      userData,
      user: req.session.user || null,
      isAuthenticated: !!req.session.user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Server error");
  }
});

router.get("/userProfile/:id", async (req, res) => {
  try {
    const userID = req.params.id;
    let userData = await Client.findOne({ _id: userID }).lean();
    if (!userData) userData = await User.findOne({ _id: userID }).lean();
    if (!userData) return res.status(404).send("User not found");

    if (userData.bookings) {
      for (const booking of userData.bookings) {
        const engineer = await User.findById(booking.engineerId).lean();
        if (engineer?.profilePhoto)
          booking.profileImage = engineer.profilePhoto;
      }
    }

    if (userData.favoriteEngineers) {
      for (const fav of userData.favoriteEngineers) {
        const engineer = await User.findById(fav.engineerId).lean();
        if (engineer?.profilePhoto) fav.profilePhoto = engineer.profilePhoto;
      }
    }

    res.render("userProfile", {
      userData,
      user: req.session.user || null,
      isAuthenticated: !!req.session.user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Server error");
  }
});

// ✅ تعديل: رفع صورة البروفايل كـ base64
router.post("/update", upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { name, bio } = req.body;
    const userId = req.session.user._id || req.session.user.id;
    let user = await Client.findById(userId);
    if (!user) user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user instanceof Client) user.name = name || user.name;
    else user.firstName = name || user.firstName;
    user.bio = bio || user.bio;

    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString("base64");
      user.profilePhoto = `data:${req.file.mimetype};base64,${base64Image}`;
      fs.unlinkSync(req.file.path);
    }

    try {
      await user.save();

      // تحديث بيانات البروفايل للعملاء المرتبطين
      if (user.role === "Engineer") {
        const clientsWithBookings = await Client.find({
          "bookings.engineerId": user._id,
        });
        for (const client of clientsWithBookings) {
          let updated = false;
          client.bookings.forEach((booking) => {
            if (booking.engineerId.toString() === user._id.toString()) {
              booking.profileImage = user.profilePhoto;
              updated = true;
            }
          });
          if (updated) await client.save();
        }

        const clientsWithFavorites = await Client.find({
          "favoriteEngineers.engineerId": user._id,
        });
        for (const client of clientsWithFavorites) {
          let updated = false;
          client.favoriteEngineers.forEach((fav) => {
            if (fav.engineerId.toString() === user._id.toString()) {
              fav.profilePhoto = user.profilePhoto;
              updated = true;
            }
          });
          if (updated) await client.save();
        }
      }

      req.session.user = {
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user instanceof Client ? user.name : user.firstName,
      };

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          name: user instanceof Client ? user.name : user.firstName,
          bio: user.bio,
          profilePhoto: user.profilePhoto,
        },
      });
    } catch (validationError) {
      if (validationError.name === "ValidationError") {
        const errors = Object.values(validationError.errors).map((err) => {
          let message = err.message;
          if (err.path === "bio" && err.kind === "minlength") {
            message = "Bio must be at least 5 characters.";
          }
          return {
            field: err.path,
            message,
          };
        });

        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors,
        });
      }

      console.error("Unexpected error during save:", validationError);
      return res
        .status(500)
        .json({ success: false, message: "Unexpected server error" });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
});

// تغيير كلمة المرور
router.post("/change-password", isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!req.session.user || (!req.session.user._id && !req.session.user.id)) {
      return res
        .status(401)
        .json({ error: "Please log in to change your password" });
    }

    const userId = req.session.user._id || req.session.user.id;
    let user =
      req.session.user.role === "Engineer"
        ? await User.findById(userId)
        : await Client.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// حذف الحساب
router.delete("/delete-account", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.user.id;
    const userRole = req.session.user.role;

    let user;
    if (userRole === "Engineer") {
      await Package.deleteMany({ engID: userId });
      user = await User.findByIdAndDelete(userId);
    } else {
      user = await Client.findByIdAndDelete(userId);
      if (user && user.bookings) {
        for (const booking of user.bookings) {
          await User.updateMany(
            { "bookings.bookingId": booking.bookingId },
            { $pull: { bookings: { bookingId: booking.bookingId } } }
          );
        }
      }
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    req.session.destroy();
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
