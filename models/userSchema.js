const { required } = require("joi");
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  customId: {
    type: String,
    unique: true,
    sparse: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    minLength: 2,
    maxLength: 50,
    match: [/^[a-zA-Z]+$/, "First name should contain only letters"],
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minLength: 2,
    maxLength: 50,
    match: [/^[a-zA-Z]+$/, "Last name should contain only letters"],
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
  phone: { type: String, required: true, trim: true },
  password: {
    type: String,
    required: true,
    match: [
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
    ],
  },
  role: { type: String , default: "User" },
  specialties: {
    type: [String],
    default: [],
    validate: {
      validator: function (v) {
        return v.every((specialty) => specialty.trim().length > 0);
      },
      message: "Specialties should not be empty",
    },
  },
  profilePhoto: { type: String, trim: true, default: "/uploads/default.png" },
  idCardPhoto: { type: String, trim: true, required: true },
  bio: { type: String, trim: true, minLength: 5, maxLength: 500 },
  badges: {
    type: [String],
    default: [],
    validate: {
      validator: function (v) {
        const allowedBadges = [
          "Premium Designer",
          "Top Rated",
          "Most Booked",
          "New Talent",
          "Project Master",
        ];
        return v.every((badge) => allowedBadges.includes(badge));
      },
      message: "Invalid badge",
    },
  },
  termsAccepted: { type: Boolean, required: true, default: false },
  isApproved: { type: Boolean, default: false },

  resetCode: {
    type: String,
    default: null,
    match: [/^\d{6}$/, "Reset code must be 6 digits"],
  },
  resetCodeExpires: {
    type: Date,
    default: null,
    validate: {
      validator: function (v) {
        return v === null || v instanceof Date;
      },
      message: "Invalid date",
    },
  },

  testimonials: [
    {
      name: { type: String, required: true },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  bookings: [
    {
      clientName: { type: String, trim: true },
      phone: { type: String, required: true, trim: true },
      projectType: { type: String, trim: true },
      paymentMethod: { type: String, required: true },
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ["Active", "Pending"], default: "Pending" },
    
    },
  ],
});

// Rates
userSchema.methods.calculateAverageRating = function () {
  if (this.testimonials.length > 0) {
    const total = this.testimonials.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    this.averageRating = total / this.testimonials.length;
  } else {
    this.averageRating = 0;
  }
};

userSchema.pre("save", function (next) {
  this.calculateAverageRating();
  next();
});

// Badges
userSchema.pre("save", async function (next) {
  const Project = require("./projectSchema");
  const projectCount = await Project.countDocuments({ engID: this._id });

  let newBadges = [];
  const isPremium =
    this.bookings.length >= 15 && this.averageRating >= 4 && projectCount >= 10;

  if (isPremium) {
    newBadges = ["Premium Designer"];
  } else {
    if (this.averageRating >= 4.5) newBadges.push("Top Rated");
    if (this.bookings.length >= 10) newBadges.push("Most Booked");
    if (this.bookings.length === 0 && this.averageRating === 0)
      newBadges.push("New Talent");
    if (projectCount >= 10) newBadges.push("Project Master");
  }

  this.badges = newBadges;
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
