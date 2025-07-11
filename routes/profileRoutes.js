const express = require("express");
const router = express.Router();
const Project = require("../models/projectSchema");
const Package = require("../models/packageSchema");
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const multer = require("multer");
const path = require("path");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const fs = require("fs");

// إعداد multer للتخزين المؤقت
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // التأكد من وجود المجلد
    const dir = "./uploads/";
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir); // مكان مؤقت للتخزين
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // حد أقصى 5 ميجابايت
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: Images Only!");
    }
  },
});

const ratingSchema = Joi.object({
  engineerId: Joi.string().required(),
  name: Joi.string().trim().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().required(),
});

router.get("/profile/:id", async (req, res) => {
  try {
    const profile = await User.findById(req.params.id);
    const projects = await Project.find({ engID: req.params.id });
    const packages = await Package.find({ engID: req.params.id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.render("profile", {
      title: `${profile.firstName} ${profile.lastName} - Profile`,
      engData: profile,
      projects: projects,
      packages: packages,

      user: req.session.user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Error loading profile",
    });
  }
});

router.get("/eng", async (req, res) => {
  try {
    const clientUser = req.session.user;

    const occasion = req.query.occasion;

    let engineers;
    if (occasion) {
      engineers = await User.find({
        role: "Engineer",
        specialties: { $in: [new RegExp(`^${occasion}$`, "i")] },
      })
        .sort({ rating: -1 })
        .lean();
    } else {
      engineers = await User.find({ role: "Engineer" }).lean();
    }

    engineers.forEach((engineer) => {
      if (!Array.isArray(engineer.specialties)) {
        engineer.specialties = [];
      }
    });

    if (occasion) {
      engineers = await Promise.all(
        engineers.map(async (engineer) => {
          const packages = await Package.find({
            engID: engineer._id.toString(),
            type: new RegExp(`^${occasion}$`, "i"),
          })
            .limit(4)
            .lean();

          engineer.packages = packages;
          engineer.bookings = engineer.bookings;

          return engineer;
        })
      );
    } else {
      for (let engineer of engineers) {
        engineer.packages = await Package.find({
          engID: engineer._id.toString(),
        })
          .limit(4)
          .lean();
      }

      engineers = engineers.filter((engineer) => engineer.packages.length > 0); // Filter engineers with no projects
    }

    res.render("eng", {
      user: clientUser,
      engineers,
      isAuthenticated: !!clientUser,
      occasion: occasion || "All Occasions",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// معالجة تسجيل الدخول
router.post("/payment/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Client.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    req.session.user = user;
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// معالجة التسجيل
router.post(
  "/payment/register",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      const { name, email, password, phone, bio } = req.body;

      // Check if user already exists
      const existingUser = await Client.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // تحويل الصورة إلى Base64 إذا تم تحميلها
      let profilePhotoBase64 = "/uploads/default.png";
      if (req.file) {
        // قراءة الملف المؤقت
        const fileData = fs.readFileSync(req.file.path);
        // تحويل الملف إلى سلسلة Base64
        profilePhotoBase64 = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
        // حذف الملف المؤقت بعد التحويل
        fs.unlinkSync(req.file.path);
      }

      // Create new user
      const newUser = new Client({
        name,
        email,
        password: hashedPassword,
        phone,
        bio,
        role: "user",
        profilePhoto: profilePhotoBase64,
      });

      await newUser.save();
      req.session.user = newUser;

      res.json({
        success: true,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          profilePhoto: newUser.profilePhoto,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// POST /rate-engineer
router.post("/rate", async (req, res) => {
  try {
    console.log("Received data:", req.body);

    const { error } = ratingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { engineerId, name, rating, comment } = req.body;

    const engineer = await User.findOne({ _id: engineerId });
    if (!engineer) {
      return res.status(404).json({ message: " Engineer Not Found ." });
    }

    console.log("Engineer found:", engineer);

    const existingReview = engineer.testimonials.find((t) => t.name === name);

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
    } else {
      engineer.testimonials.push({ name, rating, comment });
    }

    const totalRatings = engineer.testimonials.length;
    const sumOfRatings = engineer.testimonials.reduce(
      (sum, t) => sum + t.rating,
      0
    );
    engineer.averageRating = sumOfRatings / totalRatings;

    await engineer.save();
    console.log("Updated engineer:", engineer);

    res.status(200).json({
      message: " Send Successfully!",
      averageRating: engineer.averageRating.toFixed(1),
      testimonials: engineer.testimonials,
    });
  } catch (error) {
    console.error("Error updating engineer:", error);
    res.status(500).json({ message: "Error during send ." });
  }
});

router.delete("/delete-booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Delete from Engineer's bookings
    const updatedEngineer = await User.findOneAndUpdate(
      { "bookings.bookingId": bookingId },
      { $pull: { bookings: { bookingId: bookingId } } },
      { new: true }
    );

    // Delete from Client's bookings
    const updatedClient = await Client.findOneAndUpdate(
      { "bookings.bookingId": bookingId },
      { $pull: { bookings: { bookingId: bookingId } } },
      { new: true }
    );

    if (!updatedEngineer && !updatedClient) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "Error deleting booking" });
  }
});

router.post(
  "/updateProfile",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      if (!req.session.user) {
        return res
          .status(401)
          .json({ success: false, error: "User not logged in" });
      }

      const { firstName, lastName, bio } = req.body;
      const updateData = { firstName, lastName, bio };

      // تحويل الصورة إلى Base64 إذا تم تحميلها
      if (req.file) {
        // قراءة الملف المؤقت
        const fileData = fs.readFileSync(req.file.path);
        // تحويل الملف إلى سلسلة Base64
        updateData.profilePhoto = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
        // حذف الملف المؤقت بعد التحويل
        fs.unlinkSync(req.file.path);
      }

      const userId = req.session.user.id;
      const updateUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      }).lean();

      if (!updateUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Update session with new user data
      req.session.user = {
        id: updateUser._id,
        email: updateUser.email,
        role: updateUser.role,
        name: `${updateUser.firstName} ${updateUser.lastName}`,
      };

      // استخدام الصورة مباشرة من قاعدة البيانات
      const userWithPhoto = {
        ...updateUser,
      };

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: {
          firstName: userWithPhoto.firstName,
          lastName: userWithPhoto.lastName,
          bio: userWithPhoto.bio,
          profilePhoto: userWithPhoto.profilePhoto,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Error updating profile",
      });
    }
  }
);

const updateBadges = async () => {
  try {
    const engineers = await User.find();

    for (let engineer of engineers) {
      let newBadges = [];
      const projectCount = await Project.countDocuments({
        engID: engineer._id,
      });

      const isPremium =
        engineer.bookings.length >= 15 &&
        engineer.averageRating >= 4 &&
        projectCount >= 10;

      if (isPremium) {
        newBadges = ["Premium Designer"];
      } else {
        if (engineer.averageRating >= 4.5) newBadges.push("Top Rated");
        if (engineer.bookings.length >= 10) newBadges.push("Most Booked");
        if (engineer.bookings.length === 0 && engineer.averageRating === 0)
          newBadges.push("New Talent");
        if (projectCount >= 10) newBadges.push("Project Master");
      }

      engineer.badges = newBadges;
      await engineer.save();
    }
  } catch (error) {
    console.error("Error updating badges:", error);
  }
};

module.exports = router;
module.exports.updateBadges = updateBadges;
