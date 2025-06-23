const express = require("express");
const router = express.Router();
const Project = require("../models/projectSchema");
const Package = require("../models/packageSchema");
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const multer = require("multer");
const path = require("path");
const Joi = require("joi");
const bcrypt = require('bcrypt');




router.get("/confirmation", async (req, res) => {
  const clientUser = req.session.user;
  if (!clientUser) {
    return res.redirect('/');
  }
  // اجلب بيانات الحجز من ال query
  const { bookingId, packageName, price, deposit, eventDate, paymentMethod } = req.query;
  let pkg = null;
  if (packageName) {
    pkg = await Package.findOne({ name: packageName }); // بدون lean هنا لأننا سنعدل
  }
  // أضف الحجز لبروفايل المهندس
  if (pkg && pkg.engID) {
    const engineer = await User.findById(pkg.engID);
    if (engineer) {
      engineer.bookings = engineer.bookings || [];
      engineer.bookings.push({
        clientName: clientUser.name || (clientUser.firstName ? (clientUser.firstName + ' ' + (clientUser.lastName || '')) : 'Unknown'),
        phone: clientUser.phone,
        projectType: pkg.eventType,
        packageName: pkg.name,
        price: price,
        deposit: deposit,
        remaining: price && deposit ? (parseInt(price) - parseInt(deposit)) : '',
        eventDate: eventDate,
        paymentMethod: paymentMethod || 'Unknown',
        status: 'Active',
        date: new Date()
      });
      await engineer.save();
    }
  }
  res.render("confirmation", {
    stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    user: clientUser,
    bookingId,
    packageName,
    price,
    deposit,
    eventDate,
    package: pkg ? pkg.toObject() : null
  });
});




module.exports = router;