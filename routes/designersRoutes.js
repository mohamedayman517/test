const express = require("express");
const router = express.Router();
const Client = require("../models/clientSchema");
const User = require("../models/userSchema");
const Project = require("../models/projectSchema");

router.get("/designers", async function (req, res) {
  try {
    const clientUser = req.session.user;
    const { specializations } = req.query;
    
    // Build the query
    let query = { role: "Engineer", isApproved: true, isVerified: true };
    
    // If specializations are provided, filter by them
    if (specializations) {
      const specArray = Array.isArray(specializations) ? specializations : [specializations];
      query.specialties = { $in: specArray.map(s => new RegExp(`^${s}$`, 'i')) };
    }

    // Find engineers matching the query
    const engineers = await User.find(query).lean();

    // Get projects for each engineer
    for (let engineer of engineers) {
      engineer.projects = await Project.find({
        engID: engineer._id.toString(),
      }).lean();
    }

    res.render("designers", { 
      engineers,
      user: clientUser,
      selectedSpecializations: specializations ? (Array.isArray(specializations) ? specializations : [specializations]) : []
    });
  } catch (error) {
    console.error("Error loading designers:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
