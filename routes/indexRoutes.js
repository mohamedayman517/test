const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");

router.get("/", async (req, res) => {
  const engineers = await User.find({ role: "Engineer" }).lean();
    res.render("index",{engineers, user:req.session.user||null});

});





module.exports = router;