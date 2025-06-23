const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");

// Get all engineers
router.get("/api/engineers", async (req, res) => {
  try {
    const engineers = await User.find({ role: "Engineer" });
    res.json(engineers);
  } catch (error) {
    console.error("Error fetching engineers:", error);
    res.status(500).json({ error: "Error fetching engineers" });
  }
});

// Get current user's favorite engineers
router.get('/api/favorites', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json([]);
    }
    const client = await Client.findOne({ email: req.session.user.email });
    if (!client) {
      return res.status(404).json([]);
    }
    res.json(Array.isArray(client.favoriteEngineers) ? client.favoriteEngineers : []);
  } catch (error) {
    res.status(500).json([]);
  }
});

// Add engineer to favorites
router.post("/api/favorites/add", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Please login to add favorites" });
    }

    const { engineerId } = req.body;
    if (!engineerId) {
      return res.status(400).json({ error: "Engineer ID is required" });
    }

    // Get client by email instead of ID
    const client = await Client.findOne({ email: req.session.user.email });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Get engineer details
    const engineer = await User.findById(engineerId);
    if (!engineer) {
      return res.status(404).json({ error: "Engineer not found" });
    }

    // Initialize favoriteEngineers array if it doesn't exist
    if (!client.favoriteEngineers) {
      client.favoriteEngineers = [];
    }

    // Check if engineer is already in favorites
    const isAlreadyFavorite = client.favoriteEngineers.some(
      (fav) => fav.engineerId.toString() === engineerId
    );

    if (isAlreadyFavorite) {
      return res.status(400).json({ error: "Engineer already in favorites" });
    }

    // Add to favorites
    client.favoriteEngineers.push({
      engineerId: engineer._id,
      engineerName: `${engineer.firstName} ${engineer.lastName}`,
      profilePhoto: engineer.profilePhoto || '/uploads/default.png',
      bio: engineer.bio || ''
    });

    await client.save();
    res.json({ 
      success: true,
      message: "Engineer added to favorites", 
      favorites: client.favoriteEngineers 
    });
  } catch (error) {
    console.error("Error adding to favorites:", error);
    res.status(500).json({ error: "Error adding to favorites" });
  }
});

// Remove engineer from favorites
router.post("/api/favorites/remove", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Please login to remove favorites" });
    }

    const { engineerId } = req.body;
    if (!engineerId) {
      return res.status(400).json({ error: "Engineer ID is required" });
    }

    // Get client by email instead of ID
    const client = await Client.findOne({ email: req.session.user.email });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Initialize favoriteEngineers array if it doesn't exist
    if (!client.favoriteEngineers) {
      client.favoriteEngineers = [];
    }

    // Remove from favorites
    client.favoriteEngineers = client.favoriteEngineers.filter(
      (fav) => fav.engineerId.toString() !== engineerId
    );

    await client.save();
    res.json({ 
      success: true,
      message: "Engineer removed from favorites", 
      favorites: client.favoriteEngineers 
    });
  } catch (error) {
    console.error("Error removing from favorites:", error);
    res.status(500).json({ error: "Error removing from favorites" });
  }
});

// Get user's favorite engineers
router.get("/api/favorites", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Please login to view favorites" });
    }

    // Get client by email instead of ID
    const client = await Client.findOne({ email: req.session.user.email });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Initialize favoriteEngineers array if it doesn't exist
    if (!client.favoriteEngineers) {
      client.favoriteEngineers = [];
    }

    res.json(client.favoriteEngineers);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Error fetching favorites" });
  }
});

module.exports = router;
