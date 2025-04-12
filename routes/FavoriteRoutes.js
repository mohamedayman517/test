const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");

router.get("/api/engineers", async (req, res) => {
  try {
    const engineers = await User.find();
    res.json(engineers);
  } catch (error) {
    res.status(500).json({ error: "Error fetching engineers" });
  }
});
router.get("/Favorite", async (req, res) => {
  const clientUser  = req.session.user
  res.render("Favorite" ,{user:clientUser});
});

// في FavoriteRoutes.js
router.get("/api/engineers/:id", async (req, res) => {
  try {
    const engineer = await User.findById(req.params.id);
    if (!engineer) {
      return res.status(404).json({ error: "Engineer not found" });
    }
    res.json(engineer);
  } catch (error) {
    res.status(500).json({ error: "Error fetching engineer" });
  }
});

module.exports = router;
