const express = require("express");
const router = express.Router();
const Project = require("../models/projectSchema");
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Create a project
router.post("/create", upload.single("projectImage"), async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ success: false, message: "Please log in to create projects." });
    }

    const { projectName, projectType, projectArea, projectPrice } = req.body;

    // Validate required fields
    if (!projectName || !projectType || !projectArea || !projectPrice || !req.file) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Validate numeric fields
    const area = parseFloat(projectArea);
    const price = parseFloat(projectPrice);
    
    if (isNaN(area) || area <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project area." });
    }
    
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project price." });
    }

    const newProject = new Project({
      name: projectName,
      engID: req.session.user.id,
      image: `/uploads/${req.file.filename}`,
      price: price,
      type: projectType,
      area: area,
    });

    await newProject.save();
    res.json({ success: true, message: "Project created successfully" });
  } catch (error) {
    console.error("Error saving project:", error);
    res.status(500).json({ success: false, message: "Server error saving project" });
  }
});

// Get a single project
router.get("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ success: false, message: "Server error fetching project" });
  }
});

// Update a project
router.put("/projects/:id", upload.single("projectImage"), async (req, res) => {
  try {
    const { projectName, projectType, projectArea, projectPrice } = req.body;
    
    // Validate required fields
    if (!projectName || !projectType || !projectArea || !projectPrice) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Validate numeric fields
    const area = parseFloat(projectArea);
    const price = parseFloat(projectPrice);
    
    if (isNaN(area) || area <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project area." });
    }
    
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "Invalid project price." });
    }

    const updateData = {
      name: projectName,
      type: projectType,
      area: area,
      price: price
    };

    // If a new image was uploaded, update the image path
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ success: false, message: "Server error updating project" });
  }
});

// Delete a project
router.delete("/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const deletedProject = await Project.findByIdAndDelete(projectId);
    if (!deletedProject) {
      return res.status(404).send("Project not found.");
    }
    res.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).send("Server error while deleting project.");
  }
});

module.exports = router;