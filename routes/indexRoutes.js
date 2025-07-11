const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");

router.get("/", async (req, res) => {
  // Check if there is a logged-in user
  if (req.session && req.session.user) {
    // If user is an engineer, redirect to their profile page
    if (req.session.user.role === "Engineer") {
      return res.redirect(`/profile/${req.session.user.id}`);
    }
    // If user is an admin, redirect to dashboard
    else if (req.session.user.role === "Admin") {
      return res.redirect("/AdminDashboard");
    }
    // If user is regular, show homepage with user data
  }

  // If no logged-in user or regular user, show homepage
  const engineers = await User.find({ role: "Engineer" }).lean();
  res.render("index", { engineers, user: req.session.user || null });
});

module.exports = router;
