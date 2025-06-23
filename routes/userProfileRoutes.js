const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const Client = require("../models/clientSchema");
const User = require("../models/userSchema");
const multer = require("multer");
const path = require("path");
const Joi = require("joi");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, "profile-" + Date.now() + path.extname(file.originalname));
  },
});


const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
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


// Authentication middleware
const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.user) {
    // تحقق من وجود المستخدم فعليًا في الداتا بيز
    const userId = req.session.user._id || req.session.user.id;
    let user = await User.findById(userId);
    if (!user) user = await Client.findById(userId);

    if (user) {
      return next();
    } else {
      // المستخدم اتحذف من الداتا بيز
      req.session.destroy(() => {
        return res.redirect('/login?message=Your account has been deleted.');
      });
    }
  } else {
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
  }
};



router.get("/userProfile", async (req, res) => {
  try {
    // If no ID is provided, use the logged-in user's ID
    const userID = req.session.user?._id;
    
    if (!userID) {
      return res.redirect('/login');
    }

    let userData = null;

    // Try to find user in Client model first
    userData = await Client.findOne({ _id: userID }).lean();

    // If not found in Client, try User model
    if (!userData) {
      userData = await User.findOne({ _id: userID }).lean();
    }

    if (!userData) {
      return res.status(404).send("User not found");
    }

    // Ensure the profile photo path is correct
    if (userData.profilePhoto && !userData.profilePhoto.startsWith("/uploads/")) {
      userData.profilePhoto = "/uploads/" + userData.profilePhoto;
    }

    res.render("userProfile", {
      userData,
      user: req.session.user || null,
      isAuthenticated: !!req.session.user
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Server error");
  }
});

router.get("/userProfile/:id", async (req, res) => {
  try {
    const userID = req.params.id;
    let userData = null;

    // Try to find user in Client model first
    userData = await Client.findOne({ _id: userID }).lean();

    // If not found in Client, try User model
    if (!userData) {
      userData = await User.findOne({ _id: userID }).lean();
    }

    if (!userData) {
      return res.status(404).send("User not found");
    }

    // Ensure the profile photo path is correct
    if (userData.profilePhoto && !userData.profilePhoto.startsWith("/uploads/")) {
      userData.profilePhoto = "/uploads/" + userData.profilePhoto;
    }

    // --- فلترة المهندسين المفضلين ---
    if (userData.favoriteEngineers && userData.favoriteEngineers.length > 0) {
      const validFavorites = [];
      let changed = false;
      for (const fav of userData.favoriteEngineers) {
        const engineerExists = await User.findById(fav.engineerId);
        if (engineerExists) {
          validFavorites.push(fav);
        } else {
          changed = true;
        }
      }
      if (changed) {
        await Client.findByIdAndUpdate(userData._id, { favoriteEngineers: validFavorites });
        userData.favoriteEngineers = validFavorites;
      }
    }

    res.render("userProfile", {
      userData,
      user: req.session.user || null,
      isAuthenticated: !!req.session.user
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Server error");
  }
});

// Helper function to get status badge classes
function getStatusClass(status) {
  switch (status) {
    case 'Completed':
      return 'bg-success';
    case 'Confirmed':
      return 'bg-primary';
    case 'Cancelled':
      return 'bg-danger';
    default:
      return 'bg-warning';
  }
}

router.post("/update", upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { name, bio } = req.body;
    const userId = req.session.user._id || req.session.user.id; // Handle both id and _id
    let user = null;

    // Try to find user in Client model first
    user = await Client.findById(userId);

    // If not found in Client, try User model
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update user data
    if (user instanceof Client) {
      user.name = name || user.name;
    } else {
      user.firstName = name || user.firstName;
    }
    user.bio = bio || user.bio;

    // Handle profile photo upload
    if (req.file) {
      user.profilePhoto = "/uploads/" + req.file.filename;
    }

    await user.save();

    // Update session with new user data
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
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.name === 'ValidationError') {
      // استخراج رسالة مختصرة للبايو فقط
      if (error.errors && error.errors.bio && error.errors.bio.kind === 'minlength') {
        return res.status(400).json({ success: false, message: 'Bio Must be 5 letters Minimume' });
      }
      // رسائل فاليديشن أخرى
      return res.status(400).json({ success: false, message: 'Error' });
    }
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
});




// Change Password Route
router.post('/change-password', isAuthenticated, async (req, res) => {

  try {
    const { currentPassword, newPassword } = req.body;
  if (!req.session.user || (!req.session.user._id && !req.session.user.id)) {

      return res.status(401).json({ error: 'Please log in to change your password' });
    }

  const userId = req.session.user._id || req.session.user.id;


    // Find the user based on role
    let user;
    if (req.session.user.role === 'Engineer') {
      user = await User.findById(userId);
    } else {
      user = await Client.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete Account Route
router.delete('/delete-account', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.user.id;
    const userRole = req.session.user.role;

    let user;
    if (userRole === 'Engineer') {
      // Delete engineer and their packages
      await Package.deleteMany({ engID: userId });
      user = await User.findByIdAndDelete(userId);
    } else {
      // Delete client and their bookings
      user = await Client.findByIdAndDelete(userId);
      // Remove client's bookings from engineers' booking lists
      if (user && user.bookings) {
        for (const booking of user.bookings) {
          await User.updateMany(
            { 'bookings.bookingId': booking.bookingId },
            { $pull: { bookings: { bookingId: booking.bookingId } } }
          );
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear session
    req.session.destroy();

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});




module.exports = router;
