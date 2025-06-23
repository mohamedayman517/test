const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    engID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    eventType: {
      type: String,
      required: true,
      enum: ["Wedding", "Engagement", "Birthday", "Babyshower"],
      set: v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
    },
    essentialItems: [
      {
        type: String,
        trim: true,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

// Pre-save middleware to handle text case
packageSchema.pre('save', function(next) {
  // Convert name and description to proper case
  if (this.name) {
    this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
  }
  if (this.description) {
    this.description = this.description.charAt(0).toUpperCase() + this.description.slice(1).toLowerCase();
  }
  
  // Handle essential items
  if (this.essentialItems && this.essentialItems.length > 0) {
    this.essentialItems = this.essentialItems.map(item => 
      item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
    );
  }
  
  next();
});

module.exports = mongoose.model("Package", packageSchema);
