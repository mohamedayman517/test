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
      bookingId: { type: String, required: true },
      engineerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      engineerName: { type: String, required: true },
      profileImage:{  type: String },
      projectType: { type: String, required: true },
      packageName: { type: String, required: true },
      price: { type: Number, required: true },
      deposit: { type: Number, required: true },
      date: { type: Date, required: true },
      status: { 
        type: String, 
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending'
      },
      rating: { type: Number, min: 1, max: 5 },
      review: { type: String },
      paymentStatus: { 
        type: String, 
        enum: ['Paid', 'Pending'],
        default: 'Pending'
      },
      paymentId: { type: String }
    }
  ],
  favoriteEngineers: [
    {
      engineerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      engineerName: String,
      profilePhoto: String,
      bio: String
    }
  ]
});

module.exports = mongoose.model("Client", clientSchema); 