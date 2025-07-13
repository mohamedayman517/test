const express = require("express");
const router = express.Router();
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const transporter = require("../utils/emailTransporter");
const Booking = require("../models/userSchema");

// Admin Dashboard
router.get("/AdminDashboard", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Admin") {
      return res.status(403).send("Access denied. Admins only.");
    }
    const engineers = await User.find({ role: "Engineer" }).lean();

    let allBookings = [];
    let totalRevenue = 0;

    // Collect all bookings from all engineers
    engineers.forEach((engineer) => {
      if (Array.isArray(engineer.bookings)) {
        engineer.bookings.forEach((booking) => {
          // Add engineer name to booking
          booking.engineerName = engineer.firstName + " " + engineer.lastName;

          // Add booking to general array
          allBookings.push(booking);

          // Calculate commission
          if (booking.commission) {
            totalRevenue += booking.commission;
          }
        });
      }
    });

    res.render("AdminDashboard", {
      engineers,
      bookings: allBookings, // استخدم allBookings هنا
      totalRevenue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Delete Engineer
router.delete("/AdminDashboard/engineers/:id", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Admin") {
      return res.status(403).send("Access denied. Admins only.");
    }
    const engineerId = req.params.id;

    // حذف كل المشاريع الخاصة بالمهندس
    await require("../models/projectSchema").deleteMany({ engID: engineerId });
    // حذف كل الباكدجات الخاصة بالمهندس
    await require("../models/packageSchema").deleteMany({ engID: engineerId });
    // حذف المهندس نفسه
    const deletedEngineer =
      await require("../models/userSchema").findByIdAndDelete(engineerId);
    if (!deletedEngineer) {
      return res.status(404).send("Engineer not found.");
    }
    // حذف كل الحجوزات المرتبطة بالمهندس من جميع العملاء
    await require("../models/clientSchema").updateMany(
      {},
      { $pull: { bookings: { engineerId: engineerId } } }
    );
    // حذف كل الحجوزات المرتبطة بالمهندس من جدول User (لو فيه مهندسين آخرين عندهم حجوزات معه)
    await require("../models/userSchema").updateMany(
      {},
      { $pull: { bookings: { engineerId: engineerId } } }
    );

    res.status(200).json({ message: "Engineer deleted successfully." });
  } catch (error) {
    console.error("Error deleting engineer:", error);
    res.status(500).send("Server error while deleting engineer.");
  }
});

router.post("/approve-engineer", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Approving engineer with email:", email);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    console.log("Generated verification code:", verificationCode);

    // Update engineer status and save verification code
    const engineer = await User.findOneAndUpdate(
      { email, role: "Engineer" },
      {
        isApproved: true,
        verificationCode,
        verificationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      { new: true }
    );

    if (!engineer) {
      console.log("Engineer not found with email:", email);
      return res.status(404).json({ message: "Engineer not found" });
    }

    console.log("Engineer found and updated:", engineer.email);

    // Create verification link
    const verificationLink = `https://decoreee-moreee-production.up.railway.app/verify?engineerId=${engineer._id}`;

    // Send verification email with link
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Engineer Account Activation",
      html: `
        <h2>Welcome to Decor And More!</h2>
        <p>Your engineer account has been approved by the admin.</p>
        <p>Please click the link below to verify your account:</p>
        <a href="${verificationLink}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        ">Verify Account</a>
        <p>Or use this verification code: <strong>${verificationCode}</strong></p>
        <p>This link and code will expire in 24 hours.</p>
        <p>After verification, you can login to your account.</p>
        <p>Best regards,<br>Decor And More Team</p>
      `,
    };

    console.log("Attempting to send email to:", email);
    console.log("Verification link:", verificationLink);

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);

    res.json({ message: "Engineer approved successfully" });
  } catch (error) {
    console.error("Error in approve-engineer route:", error);
    res.status(500).json({ message: "Error approving engineer" });
  }
});

router.get("/pending-engineers", async (req, res) => {
  try {
    const pendingEngineers = await User.find({
      role: "Engineer",
      isApproved: false,
    }).select("firstName lastName email phone idCardPhoto hasPaidSubscription");

    console.log("Found pending engineers:", pendingEngineers.length);
    res.json(pendingEngineers);
  } catch (error) {
    console.error("Error fetching pending engineers:", error);
    res.status(500).json({ message: "Error fetching pending engineers" });
  }
});

router.post("/reject-engineer", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Admin") {
      return res.status(403).json({ message: "غير مسموح لك بالوصول" });
    }

    const { email } = req.body;
    const engineer = await User.findOne({ email, role: "Engineer" });

    if (!engineer) {
      return res.status(404).json({ message: "لم يتم العثور على المهندس." });
    }

    // حذف المهندس من قاعدة البيانات
    await User.deleteOne({ email });

    res.json({ message: "تم رفض المهندس بنجاح وحذفه من القائمة." });
  } catch (error) {
    console.error("❌ خطأ أثناء رفض المهندس:", error);
    res.status(500).json({ message: "حدث خطأ أثناء رفض المهندس." });
  }
});

// Route to get total client count
router.get("/admin/client-count", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Count all clients in the database
    const clientCount = await Client.countDocuments();

    res.json({ count: clientCount });
  } catch (error) {
    console.error("Error fetching client count:", error);
    res.status(500).json({ message: "Error fetching client count" });
  }
});

module.exports = router;
