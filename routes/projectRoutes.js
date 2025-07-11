const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const Project = require("../models/projectSchema");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ إنشاء مشروع جديد
router.post("/create", upload.single("projectImage"), async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to create projects.",
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

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    const newProject = new Project({
      name: projectName,
      engID: req.session.user.id,
      image: imageData,
      price: price,
      type: projectType,
      area: area,
    });

    await newProject.save();
    res.json({ success: true, message: "Project created successfully" });
  } catch (error) {
    console.error("Error saving project:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error saving project" });
  }
});

// ✅ تعديل مشروع
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

    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString("base64");
      updateData.image = `data:${req.file.mimetype};base64,${base64Image}`;
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
      .json({ success: false, message: "Server error updating project" });
  }
});

// ✅ عرض مشروع
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
      .json({ success: false, message: "Server error fetching project" });
  }
});

// ✅ حذف مشروع
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
