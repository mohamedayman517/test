const express = require("express");
const router = express.Router();
const Project = require("../models/projectSchema");
const User = require("../models/userSchema");
const client = require("../models/clientSchema")
const multer = require("multer");
const path = require("path");
const Joi = require("joi");

const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage });

const ratingSchema = Joi.object({
  engineerId: Joi.string().required(),
  name: Joi.string().trim().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().required(),
});

router.get("/profile/:id", async (req, res) => {
  try {
    const fromShowMore = req.query.fromShowMore === "true";
    const engineerId = req.params.id;

    const engData = await User.findOne({ _id: engineerId }).lean();
    const projects = await Project.find({ engID: engineerId }).lean();
    if (!engData) return res.status(404).send("Engineer not found");

    // Ensure the profile photo path is correct
    if (engData.profilePhoto && !engData.profilePhoto.startsWith('/uploads/')) {
      engData.profilePhoto = '/uploads/' + engData.profilePhoto;
    }

    res.render("profile", {
      
      projects,
      engData,
      badges: engData.badges,
      booking: engData.bookings,
      fromShowMore,
      user: req.session.user || null,
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.get("/eng", async (req, res) => {
  try {
    const clientUser =  req.session.user;
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
          const projects = await Project.find({
            engID: engineer._id.toString(),
            type: new RegExp(`^${occasion}$`, "i"),
          })
            .limit(4)
            .lean();

          engineer.projects = projects;
          engineer.bookings = engineer.bookings;

          return projects.length > 0 ? engineer : null;
        })
      );

      engineers = engineers.filter(Boolean);
    } else {
      for (let engineer of engineers) {
        engineer.projects = await Project.find({
          engID: engineer._id.toString(),
        })
          .limit(4)
          .lean();
      }

      engineers = engineers.filter((engineer) => engineer.projects.length > 0); // Filter engineers with no projects
    }

    res.render("eng", {
      user :clientUser,
      engineers,
      occasion: occasion || "All Occasions",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

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

    const updatedUser = await User.findOneAndUpdate(
      { "bookings._id": bookingId },
      { $pull: { bookings: { _id: bookingId } } },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: " Booking Not Found " });
    }

    res.json({ success: true, message: " Success Delete " });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "  Error During Delete " });
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

      if (req.file) {
        updateData.profilePhoto = "/uploads/" + req.file.filename;
      }

      const userId = req.session.user.id;
      const updateUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      }).lean();

      if (!updateUser) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Update session with new user data
      req.session.user = {
        id: updateUser._id,
        email: updateUser.email,
        role: updateUser.role,
        name: `${updateUser.firstName} ${updateUser.lastName}`
      };

      // Ensure the profile photo path is correct
      const userWithPhoto = {
        ...updateUser,
        profilePhoto: updateUser.profilePhoto.startsWith('/uploads/') 
          ? updateUser.profilePhoto 
          : '/uploads/' + updateUser.profilePhoto
      };

      res.status(200).json({ 
        success: true, 
        message: "Profile updated successfully",
        user: {
          firstName: userWithPhoto.firstName,
          lastName: userWithPhoto.lastName,
          bio: userWithPhoto.bio,
          profilePhoto: userWithPhoto.profilePhoto
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false, 
        error: "Error updating profile" 
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

module.exports = { updateBadges };
module.exports = router;
