const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  engID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  image: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  price: { type: Number, required: true },
  type: { type: String, required: true },
  area: { type: Number, required: true }, 
});

// Save Badges
projectSchema.post("save", async function () {
  const User = require("./userSchema");
  const projectCount = await mongoose
    .model("Project")
    .countDocuments({ engID: this.engID });

  const engineer = await User.findById(this.engID);
  if (engineer) {
    let newBadges = [];
    const isPremium =
      engineer.bookings.length >= 15 &&
      engineer.averageRating >= 4 &&
      projectCount >= 10;

    if (isPremium) {
      newBadges = ["Premium Designer"];
    } else {
      if (engineer.averageRating >= 4.5) newBadges.push("Top Rated");
      if (engineer.bookings.length >= 10) newBadges.push("Most Booked");
      if (engineer.bookings.length === 0 && engineer.averageRating === 0)
        newBadges.push("New Talent");
      if (projectCount >= 10) newBadges.push("Project Master");
    }

    engineer.badges = newBadges;
    await engineer.save();
  }
});

// Delete Badges
projectSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  const User = require("./userSchema");
  const projectCount = await mongoose
    .model("Project")
    .countDocuments({ engID: doc.engID });

  const engineer = await User.findById(doc.engID);
  if (engineer) {
    let newBadges = [];
    const isPremium =
      engineer.bookings.length >= 15 &&
      engineer.averageRating >= 4 &&
      projectCount >= 10;

    if (isPremium) {
      newBadges = ["Premium Designer"];
    } else {
      if (engineer.averageRating >= 4.5) newBadges.push("Top Rated");
      if (engineer.bookings.length >= 10) newBadges.push("Most Booked");
      if (engineer.bookings.length === 0 && engineer.averageRating === 0)
        newBadges.push("New Talent");
      if (projectCount >= 10) newBadges.push("Project Master");
    }

    engineer.badges = newBadges;
    await engineer.save();
  }
});

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
