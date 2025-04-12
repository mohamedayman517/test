const express = require("express");
const router = express.Router();
const Client = require("../models/clientSchema");

const User = require("../models/userSchema");
const Project = require("../models/projectSchema");
router.get("/designers", async function (req, res) {
  try {
    const clientUser  = req.session.user 
    const engineers = await User.find({ role: "Engineer" }).lean();

    for (let engineer of engineers) {
      engineer.projects = await Project.find({
        engID: engineer._id.toString(),
      }).lean();
    }

    res.render("designers", { engineers ,user: clientUser });
  } catch (error) {
    console.error("Error loading designers:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
