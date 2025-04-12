const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.get("/contact", function (req, res) {
  const clientUser  = req.session.user
  res.render("contact", {user:clientUser});
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});
router.post("/contact", async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body;
  if (!fullName || !email || !phone || !subject || !message) {
    return res.status(400).json({ message: "Please fill all fields" });
  }
  try {
    const mailOptions = {
      from: email,
      to: process.env.EMAIL,
      subject: `Contact Us : ${subject}`,
      text: `From: ${fullName} ${email}\nPhone: ${
        phone || "Not Provided"
      }\n\nMessage:\n${message}`,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
});

module.exports = router;
