const express = require("express");
const router = express.Router();
const Message = require("../models/messageSchema");
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const mongoose = require("mongoose");

// عرض صفحة الشات
router.get("/chat/:userId/:engineerId", async (req, res) => {
  try {
    const { userId, engineerId } = req.params;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(engineerId)) {
      return res.status(400).send("Invalid user or engineer ID");
    }

    // Try to find client first, then user
    let user = await Client.findById(userId);
    if (!user) {
      user = await User.findById(userId);
    }

    const engineer = await User.findById(engineerId);

    if (!user) {
      return res.status(404).send(`User with ID ${userId} not found`);
    }
    if (!engineer) {
      return res.status(404).send(`Engineer with ID ${engineerId} not found`);
    }
    
    const messages = await Message.find({
      $or: [
        { userId, engineerId },
        { userId: engineerId, engineerId: userId }
      ]
    }).sort({ timestamp: 1 });

    // Pass the IDs as strings to the template
    res.render("chat", { 
      user: { ...user.toObject(), _id: user._id.toString() }, 
      engineer: { ...engineer.toObject(), _id: engineer._id.toString() }, 
      messages 
    });
  } catch (error) {
    console.error("Error loading chat page:", error);
    res.status(500).send("Server error");
  }
});

// استرجاع الرسائل بين المستخدم والمهندس
router.get("/messages/:userId/:engineerId", async (req, res) => {
  try {
    const { userId, engineerId } = req.params;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(engineerId)) {
      return res.status(400).json({ error: 'Invalid user or engineer ID' });
    }

    const messages = await Message.find({
      $or: [
        { userId, engineerId },
        { userId: engineerId, engineerId: userId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// إرسال رسالة
router.post("/messages/send", async (req, res) => {
  try {
    const { userId, engineerId, content, senderType } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(engineerId)) {
      return res.status(400).json({ error: 'Invalid user or engineer ID' });
    }

    // Prevent engineers from messaging themselves
    if (userId === engineerId) {
      return res.status(400).json({ error: 'Engineers cannot message themselves' });
    }

    // Get sender information
    let sender;
    let senderName;
    
    if (senderType === 'user') {
      sender = await Client.findById(userId);
      if (!sender) {
        sender = await User.findById(userId);
      }
      // For clients, use the name field directly
      // For users, use firstName
      senderName = sender ? (sender.name || sender.firstName) : 'Guest';
    } else {
      sender = await User.findById(engineerId);
      senderName = sender ? sender.firstName : 'Guest';
    }

    const message = new Message({
      userId: new mongoose.Types.ObjectId(userId),
      engineerId: new mongoose.Types.ObjectId(engineerId),
      content,
      senderType,
      senderName
    });

    await message.save();
    
    // Get the io instance from the app
    const io = req.app.get('io');
    if (!io) {
      console.error('Socket.io instance not found');
      return res.status(500).json({ error: 'Server error: Socket.io not initialized' });
    }
    
    // Emit the message to the specific chat room with both IDs
    // Create a consistent room ID by sorting the IDs alphabetically
    const roomId = [userId, engineerId].sort().join('-');
    console.log(`Emitting message to room: ${roomId}`);
    io.to(roomId).emit('message', message);
    
    // Emit notification to the engineer if message is from user
    // Emit notification to the user if message is from engineer
    if (senderType === 'user') {
      io.to(`engineer-${engineerId}`).emit('notification', {
        messageId: message._id,
        userId,
        engineerId,
        content,
        senderName,
        timestamp: message.timestamp
      });
    } else {
      io.to(`user-${userId}`).emit('notification', {
        messageId: message._id,
        userId,
        engineerId,
        content,
        senderName,
        timestamp: message.timestamp
      });
    }
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// تحديث حالة الرسالة كمقروءة
router.put("/messages/:messageId/read", async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("Error updating message status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Mark messages as read
router.post('/mark-read', async (req, res) => {
  try {
    const { userId, engineerId } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(engineerId)) {
      return res.status(400).json({ error: 'Invalid user or engineer ID' });
    }

    await Message.updateMany(
      { userId: engineerId, engineerId: userId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Error marking messages as read' });
  }
});

// Chat route with just engineerId
router.get("/chat/:engineerId", async (req, res) => {
  try {
    const { engineerId } = req.params;
    
    // Check if user is logged in
    if (!req.session.user) {
      return res.redirect('/login');
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(engineerId)) {
      return res.status(400).send("Invalid engineer ID");
    }

    // Get current user - try both Client and User models
    let user = null;
    
    // First try to find in Client model
    if (req.session.user.role === 'Client') {
      user = await Client.findById(req.session.user.id);
    } 
    
    // If not found in Client, try User model
    if (!user) {
      user = await User.findById(req.session.user.id);
    }
    
    // If still not found, try using the ID directly from session
    if (!user) {
      user = await Client.findById(req.session.user._id);
      if (!user) {
        user = await User.findById(req.session.user._id);
      }
    }

    const engineer = await User.findById(engineerId);

    if (!user) {
      console.error("User not found in database. Session data:", req.session.user);
      return res.status(404).send("User not found. Please log in again.");
    }
    
    if (!engineer) {
      return res.status(404).send(`Engineer with ID ${engineerId} not found`);
    }
    
    const messages = await Message.find({
      $or: [
        { userId: user._id, engineerId },
        { userId: engineerId, engineerId: user._id }
      ]
    }).sort({ timestamp: 1 });

    // Pass the IDs as strings to the template
    res.render("chat", { 
      user: { ...user.toObject(), _id: user._id.toString() }, 
      engineer: { ...engineer.toObject(), _id: engineer._id.toString() }, 
      messages 
    });
  } catch (error) {
    console.error("Error loading chat page:", error);
    res.status(500).send("Server error");
  }
});

// Get current user route
router.get("/get-current-user", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    // Try to find the user in both Client and User models
    let user = null;
    
    // First try to find in Client model
    if (req.session.user.role === 'Client') {
      user = await Client.findById(req.session.user.id);
    } 
    
    // If not found in Client, try User model
    if (!user) {
      user = await User.findById(req.session.user.id);
    }
    
    // If still not found, try using the ID directly from session
    if (!user) {
      user = await Client.findById(req.session.user._id);
      if (!user) {
        user = await User.findById(req.session.user._id);
      }
    }

    if (!user) {
      console.error("User not found in database. Session data:", req.session.user);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name || user.firstName,
        role: user.role || 'Client'
      }
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
