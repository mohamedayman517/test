const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
      "Please enter a valid email address",
    ],
  },
  password: {
    type: String,
    required: true,
    match: [
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
    ],
  },
  bio: { type: String, trim: true, minLength: 5, maxLength: 500 },
  phone: { 
    type: String, 
    required: true, 
    trim: true 
  },
  role: { 
    type: String, 
    default: "user" 
  },
  profilePhoto: { type: String, trim: true, default: "/uploads/default.png" },
  bookings: [
    {
      clientName: String,
      phone: String,
      projectType: String,
      paymentMethod: String,
      date: Date,
      status: String,
    },
  ],
});

module.exports = mongoose.model("Client", clientSchema); 