const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  engineerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ["user", "engineer"],
    required: true
  },
  senderName: {
    type: String,
    default: "Guest"
  },
  read: {
    type: Boolean,
    default: false
  },
  notification: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
