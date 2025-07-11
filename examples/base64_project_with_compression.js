/**
 * Example of implementing image conversion to Base64 with image compression in projects route
 * This file is an illustrative example only and should not be used directly
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp"); // Make sure to install sharp library: npm install sharp
const Project = require("../models/projectSchema");

// Setup temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Configure multer with file type validation
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Maximum 10 MB
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("File must be an image"), false);
    }
  },
});

// ✅ Create new project with image compression
router.post("/create", upload.single("projectImage"), async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please login to create projects.",
      });
    }

    const { projectName, projectType, projectArea, projectPrice } = req.body;
    if (
      !projectName ||
      !projectType ||
      !projectArea ||
      !projectPrice ||
      !req.file
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const area = parseFloat(projectArea);
    const price = parseFloat(projectPrice);

    if (isNaN(area) || area <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project area." });
    }
    if (isNaN(price) || price <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project price." });
    }

    // Compress image using sharp
    const compressedImageBuffer = await sharp(req.file.path)
      .resize({ width: 1200, height: 800, fit: "inside" }) // Resize image
      .jpeg({ quality: 80 }) // Compress image with 80% quality
      .toBuffer();

    // Convert compressed image to Base64
    const base64Image = compressedImageBuffer.toString("base64");
    const imageData = `data:image/jpeg;base64,${base64Image}`;

    // Create new project
    const newProject = new Project({
      name: projectName,
      engID: req.session.user.id,
      image: imageData,
      price: price,
      type: projectType,
      area: area,
    });

    await newProject.save();

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: "Project created successfully" });
  } catch (error) {
    console.error("Error saving project:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while saving project" });
  }
});

// ✅ Edit project with image compression
router.put("/:id", upload.single("projectImage"), async (req, res) => {
  try {
    const { projectName, projectType, projectArea, projectPrice } = req.body;

    if (!projectName || !projectType || !projectArea || !projectPrice) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const area = parseFloat(projectArea);
    const price = parseFloat(projectPrice);

    if (isNaN(area) || area <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project area." });
    }
    if (isNaN(price) || price <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid project price." });
    }

    const updateData = {
      name: projectName,
      type: projectType,
      area: area,
      price: price,
    };

    // If new image was uploaded
    if (req.file) {
      // Compress image using sharp
      const compressedImageBuffer = await sharp(req.file.path)
        .resize({ width: 1200, height: 800, fit: "inside" }) // Resize image
        .jpeg({ quality: 80 }) // Compress image with 80% quality
        .toBuffer();

      // Convert compressed image to Base64
      const base64Image = compressedImageBuffer.toString("base64");
      updateData.image = `data:image/jpeg;base64,${base64Image}`;

      // Delete temporary file
      fs.unlinkSync(req.file.path);
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProject) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating project" });
  }
});

// ✅ Display project
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    res.json({ success: true, project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while fetching project" });
  }
});

// ✅ Delete project
router.delete("/:id", async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error deleting project:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while deleting project.",
      });
  }
});

module.exports = router;
