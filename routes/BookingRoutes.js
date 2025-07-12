const express = require("express");
const router = express.Router();

const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const Package = require("../models/packageSchema");

// Helper function to find client by ID
async function findClientById(userId) {
  if (!userId) {
    console.error("No user ID provided for client lookup");
    throw new Error("User ID is required");
  }

  try {
    const client = await Client.findById(userId);
    if (!client) {
      console.error(`Client not found with ID: ${userId}`);
      throw new Error("Client not found");
    }
    return client;
  } catch (error) {
    if (error.name === "CastError") {
      console.error(`Invalid user ID format: ${userId}`);
      throw new Error("Invalid user ID format");
    }
    throw error;
  }
}

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: "Please log in to submit a review" });
};

// عرض صفحة الحجز
router.get("/booking", async (req, res) => {
  const clientUser = req.session.user;
  if (!clientUser) {
    return res.redirect("/");
  }

  // جلب بيانات العميل الكاملة من قاعدة البيانات
  let clientData = null;
  try {
    clientData = await Client.findById(clientUser.id).lean();
    if (!clientData) {
      console.log("Client not found in database, using session data");
      clientData = clientUser;
    } else {
      console.log("Client found in database:", clientData.name);
    }
  } catch (error) {
    console.error("Error fetching client data:", error);
    clientData = clientUser;
  }

  let eventType = req.query.eventType || "";
  if (eventType) {
    eventType =
      eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase();
    if (eventType.replace(/\s/g, "").toLowerCase() === "babyshower")
      eventType = "BabyShower";
  }

  let pkg = null;
  if (req.query.packageId) {
    try {
      pkg = await Package.findById(req.query.packageId).lean();
    } catch (e) {
      pkg = null;
    }
  }

  res.render("Booking", {
    stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    client: clientData,
    package: pkg,
    user: clientUser,
    isAuthenticated: !!clientUser,
    selectedEventType: eventType,
  });
});

// معالجة بيانات الحجز وتحويل المستخدم إلى صفحة الدفع
router.post("/booking", async (req, res) => {
  try {
    const { packageId, eventDate, eventType } = req.body;
    const pkg = await Package.findById(packageId).lean();
    if (!pkg) {
      return res.status(404).send("Package not found");
    }
    const originalPrice = pkg.price;
    const commission = Math.round(originalPrice * 0.1);
    const totalPrice = originalPrice;
    const deposit = Math.round(totalPrice * 0.5);
    const vendorShare = totalPrice - commission;

    const bookingId = `DC-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 9000 + 1000
    )}`;

    res.render("confirmation", {
      user: req.session.user,
      isAuthenticated: !!req.session.user,
      package: pkg,
      packageName: pkg.name,
      bookingId: bookingId,
      price: totalPrice,
      deposit: deposit,
      eventDate: eventDate,
      originalPrice: originalPrice,
      stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
      eventType: eventType,
      vendorShare: deposit - commission,
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).send("Error processing booking");
  }
});

router.post("/proceed-to-payment", (req, res) => {
  try {
    const {
      bookingId,
      packageId,
      packageName,
      eventDate,
      price,
      deposit,
      eventType,
    } = req.body;

    // تسجيل معلومات الباقة للتأكد من أنها تمرر بشكل صحيح
    console.log("Proceeding to payment with package details:");
    console.log("Package ID:", packageId);
    console.log("Package Name:", packageName);
    res.render("payment", {
      stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
      user: req.session.user,
      isAuthenticated: !!req.session.user,
      bookingId: bookingId,
      packageId: packageId, // تمرير معرف الباقة
      packageName: packageName,
      price: parseInt(price),
      deposit: parseInt(deposit),
      eventDate: eventDate,
      eventType,
    });
  } catch (error) {
    console.error("Error proceeding to payment:", error);
    res.status(500).send("Error loading payment page");
  }
});

router.post("/process-payment", async (req, res) => {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const {
      payment_method_id,
      amount,
      package_name,
      package_id,
      event_date,
      user_id,
      event_type,
      booking_id,
    } = req.body;

    // تسجيل معلومات الدفع للتأكد من أنها تمرر بشكل صحيح
    console.log("Processing payment with package details:");
    console.log("Package ID:", package_id);
    console.log("Package Name:", package_name);

    const finalBookingId =
      booking_id ||
      `DC-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 9000 + 1000
      )}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "egp",
      payment_method_types: ["card"],
      payment_method: payment_method_id,
      confirm: true,
      return_url: `${process.env.DOMAIN}/payment-success`,
      metadata: {
        booking_id: finalBookingId,
        user_id: user_id,
        package_name: package_name,
        event_date: event_date,
      },
    });

    if (paymentIntent.status === "succeeded") {
      // إذا كان معرف الباقة متوفر، استخدمه للبحث عن الباقة
      // وإلا ابحث باستخدام اسم الباقة
      let package;
      let totalPrice = 0;
      if (package_id) {
        package = await Package.findById(package_id);
        console.log(`Searching for package by ID: ${package_id}`);
      } else {
        package = await Package.findOne({ name: package_name });
        console.log(`Searching for package by name: ${package_name}`);
      }

      if (package && package.engID) {
        // Log the package and engineer ID for debugging
        console.log(
          `Found package: ${package.name} with engineer ID: ${package.engID}`
        );

        const engineer = await User.findById(package.engID);
        if (!engineer) {
          console.error(`Engineer not found with ID: ${package.engID}`);
          throw new Error("Engineer not found");
        }

        // Check if engineer's bio meets the minimum length requirement (5 characters)
        // If not, set a default bio to prevent validation errors
        if (!engineer.bio || engineer.bio.length < 5) {
          console.log(
            `Engineer ${engineer._id} has a bio that's too short, setting default bio`
          );
          engineer.bio =
            "Professional designer with expertise in event decoration";
        }

        // We'll use the findClientById helper function to get the client
        let client;
        try {
          client = await findClientById(user_id);
        } catch (error) {
          console.error(`Error finding client: ${error.message}`);
          throw error;
        }

        // Check if client's bio meets the minimum length requirement (5 characters)
        // If not, set a default bio to prevent validation errors
        if (!client.bio || client.bio.length < 5) {
          console.log(
            `Client ${client._id} has a bio that's too short, setting default bio`
          );
          client.bio = "Client interested in professional decoration services";
        }

        console.log(
          `Found engineer: ${engineer.firstName} ${engineer.lastName} and client: ${client.name}`
        );

        const price = package.price || amount / 100; // السعر بالجنيه
        const commission = Math.round(price * 0.1); // 10% عمولة
        const deposit = Math.round(price * 0.5); // 50% دفعة مقدمة
        const priceAfterCommission = deposit - commission;
        const totalPrice = price; // ممكن تكتفي باستخدام price
        const remaining = totalPrice - deposit;

        // Continue with booking process
        try {
          const clientBookingDetails = {
            bookingId: finalBookingId,
            engineerId: engineer._id,
            engineerName:
              engineer.firstName +
              (engineer.lastName ? " " + engineer.lastName : ""),
            profileImage: engineer.profilePhoto || "/uploads/default.png",
            clientName: client.name || "Client",
            clientId: user_id,
            phone: client.phone || "Not provided",
            projectType: event_type || package.eventType || "Event", // ✅ pick from form
            packageName: package_name || package.name || "Package",
            packageId: package._id.toString(), // Ensure ID is stored as string
            price: amount / 100,
            deposit: amount / 100,
            date: new Date(event_date), // Keep as Date object for client schema
            paymentStatus: "Paid",
            status: "Confirmed",
            paymentId: paymentIntent.id,
            paymentMethod: paymentIntent.payment_method || "card",
          };

          const engineerBookingDetails = {
            ...clientBookingDetails,
            status: "Active",
            eventDate: event_date, // Store as string to match schema expectation
            paymentMethod: paymentIntent.payment_method || "card", // Ensure paymentMethod is set
            bookingId: finalBookingId, // Ensure bookingId is set
            commission: commission,
            priceAfterCommission: priceAfterCommission,
            totalPrice: totalPrice,
            remaining: remaining,
          };

          // Ensure bookings arrays exist
          engineer.bookings = engineer.bookings || [];
          client.bookings = client.bookings || [];

          // Add new bookings
          engineer.bookings.push(engineerBookingDetails);
          client.bookings.push(clientBookingDetails);

          // Save both documents and log success
          try {
            // Log the booking details for debugging
            console.log(
              "Engineer booking details:",
              JSON.stringify(engineerBookingDetails, null, 2)
            );

            // Validate required fields
            if (!engineerBookingDetails.bookingId)
              throw new Error("Missing bookingId");
            if (!engineerBookingDetails.clientName)
              throw new Error("Missing clientName");
            if (!engineerBookingDetails.phone) throw new Error("Missing phone");
            if (!engineerBookingDetails.projectType)
              throw new Error("Missing projectType");
            if (!engineerBookingDetails.packageName)
              throw new Error("Missing packageName");
            if (!engineerBookingDetails.price) throw new Error("Missing price");
            if (!engineerBookingDetails.deposit)
              throw new Error("Missing deposit");
            if (!engineerBookingDetails.eventDate)
              throw new Error("Missing eventDate");
            if (!engineerBookingDetails.paymentMethod)
              throw new Error("Missing paymentMethod");

            // Use save with options to prevent race conditions
            await engineer.save({ validateBeforeSave: true });
            console.log(
              `Successfully saved booking ${finalBookingId} to engineer ${engineer._id}`
            );
          } catch (saveError) {
            console.error("Error saving engineer booking:", saveError);
            console.error(
              "Validation error details:",
              saveError.errors
                ? JSON.stringify(saveError.errors)
                : "No validation details"
            );
            throw new Error(
              `Failed to save engineer booking details: ${saveError.message}`
            );
          }

          try {
            // Log the booking details for debugging
            console.log(
              "Client booking details:",
              JSON.stringify(clientBookingDetails, null, 2)
            );

            // Validate required fields for client booking
            if (!clientBookingDetails.bookingId)
              throw new Error("Missing bookingId in client booking");
            if (!clientBookingDetails.engineerId)
              throw new Error("Missing engineerId in client booking");
            if (!clientBookingDetails.engineerName)
              throw new Error("Missing engineerName in client booking");
            if (!clientBookingDetails.projectType)
              throw new Error("Missing projectType in client booking");
            if (!clientBookingDetails.packageName)
              throw new Error("Missing packageName in client booking");
            if (!clientBookingDetails.price)
              throw new Error("Missing price in client booking");
            if (!clientBookingDetails.deposit)
              throw new Error("Missing deposit in client booking");
            if (!clientBookingDetails.date)
              throw new Error("Missing date in client booking");

            // Use save with options to prevent race conditions
            await client.save({ validateBeforeSave: true });
            console.log(
              `Successfully saved booking ${finalBookingId} to client ${client._id}`
            );
          } catch (saveError) {
            console.error("Error saving client booking:", saveError);
            console.error(
              "Client validation error details:",
              saveError.errors
                ? JSON.stringify(saveError.errors)
                : "No validation details"
            );
            throw new Error(
              `Failed to save client booking details: ${saveError.message}`
            );
          }

          return res.json({
            status: "succeeded",
            message: "Payment successful",
          });
        } catch (processingError) {
          console.error("Error in booking process:", processingError);
          throw new Error(`Booking process failed: ${processingError.message}`);
        }
      }

      // If we get here, either package not found or engineer not found
      throw new Error("Failed to save booking details");
    } else if (paymentIntent.status === "requires_action") {
      return res.json({
        status: "requires_action",
        next_action: paymentIntent.next_action,
        client_secret: paymentIntent.client_secret,
      });
    } else {
      throw new Error("Payment failed");
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(400).json({
      error: error.message || "Payment failed",
    });
  }
});

router.get("/payment-success", (req, res) => {
  res.render("payment-success", {
    user: req.session.user,
    isAuthenticated: !!req.session.user,
  });
});

router.post("/submit-review", isAuthenticated, async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;
    const client = await Client.findOne({ "bookings.bookingId": bookingId });
    if (!client) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const bookingIndex = client.bookings.findIndex(
      (b) => b.bookingId === bookingId
    );
    if (bookingIndex === -1) {
      return res.status(404).json({ error: "Booking not found" });
    }
    client.bookings[bookingIndex].rating = rating;
    client.bookings[bookingIndex].review = review;
    await client.save();

    res.status(200).json({ message: "Review submitted successfully" });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

router.delete("/delete-booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Delete from Engineer's bookings
    const updatedEngineer = await User.findOneAndUpdate(
      { "bookings.bookingId": bookingId },
      { $pull: { bookings: { bookingId: bookingId } } },
      { new: true }
    );

    // Delete from Client's bookings
    const updatedClient = await Client.findOneAndUpdate(
      { "bookings.bookingId": bookingId },
      { $pull: { bookings: { bookingId: bookingId } } },
      { new: true }
    );

    if (!updatedEngineer && !updatedClient) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "Error deleting booking" });
  }
});

// Helper function to check engineer availability
async function checkEngineerAvailability(engineerId, eventDate) {
  try {
    console.log(
      `Checking availability for engineer ${engineerId} on date ${eventDate}`
    );

    // Convert eventDate to Date object for comparison with Client schema
    const targetDate = new Date(eventDate);
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59
    );

    // Check Client bookings (date field is Date object)
    const clientBookings = await Client.find({
      "bookings.engineerId": engineerId,
      "bookings.date": {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      "bookings.status": {
        $in: ["confirmed", "pending", "Confirmed", "Pending"],
      },
    });

    // Check User bookings (eventDate field is String)
    const userBookings = await User.find({
      _id: engineerId,
      "bookings.eventDate": eventDate,
      "bookings.status": {
        $in: ["Active", "Pending"],
      },
    });

    console.log(
      `Found ${clientBookings.length} client bookings and ${userBookings.length} user bookings`
    );

    // Check if any bookings exist for this date
    const hasClientBooking = clientBookings.some((client) =>
      client.bookings.some(
        (booking) =>
          booking.engineerId.toString() === engineerId &&
          booking.date >= startOfDay &&
          booking.date <= endOfDay &&
          (booking.status === "confirmed" ||
            booking.status === "pending" ||
            booking.status === "Confirmed" ||
            booking.status === "Pending")
      )
    );

    const hasUserBooking = userBookings.some((user) =>
      user.bookings.some(
        (booking) =>
          booking.eventDate === eventDate &&
          (booking.status === "Active" || booking.status === "Pending")
      )
    );

    if (hasClientBooking || hasUserBooking) {
      console.log(`Engineer is booked on ${eventDate}`);
      return {
        available: false,
        message: `Engineer is already booked on ${eventDate}`,
      };
    }

    console.log(`Engineer is available on ${eventDate}`);
    return {
      available: true,
      message: "Engineer is available on this date",
    };
  } catch (error) {
    console.error("Error checking engineer availability:", error);
    return { available: false, message: "Error checking availability" };
  }
}

// Route to check engineer availability for a specific date
router.post("/api/check-availability", async (req, res) => {
  try {
    const { engineerId, eventDate } = req.body;

    if (!engineerId || !eventDate) {
      return res.status(400).json({
        available: false,
        message: "Engineer ID and event date are required",
      });
    }

    const availabilityResult = await checkEngineerAvailability(
      engineerId,
      eventDate
    );

    return res.json({
      available: availabilityResult.available,
      message: availabilityResult.message,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return res.status(500).json({
      available: false,
      message: "Error checking availability",
    });
  }
});

// Route to get engineer's booked dates
router.get("/api/engineer-booked-dates/:engineerId", async (req, res) => {
  try {
    const { engineerId } = req.params;

    const engineer = await User.findById(engineerId);
    if (!engineer) {
      return res.status(404).json({ message: "Engineer not found" });
    }

    const bookedDates = [];

    // Get bookings from Client schema (date field is Date object)
    const clients = await Client.find({
      "bookings.engineerId": engineerId,
      "bookings.status": {
        $in: ["confirmed", "pending", "Confirmed", "Pending"],
      },
    });

    clients.forEach((client) => {
      client.bookings.forEach((booking) => {
        if (
          booking.engineerId.toString() === engineerId &&
          (booking.status === "confirmed" ||
            booking.status === "pending" ||
            booking.status === "Confirmed" ||
            booking.status === "Pending")
        ) {
          // Convert Date object to YYYY-MM-DD format
          const dateStr = booking.date.toISOString().split("T")[0];
          bookedDates.push(dateStr);
        }
      });
    });

    // Get bookings from User schema (eventDate field is String)
    const userBookings = await User.find({
      _id: engineerId,
      "bookings.status": {
        $in: ["Active", "Pending"],
      },
    });

    userBookings.forEach((user) => {
      user.bookings.forEach((booking) => {
        if (booking.status === "Active" || booking.status === "Pending") {
          bookedDates.push(booking.eventDate);
        }
      });
    });

    // Remove duplicates
    const uniqueBookedDates = [...new Set(bookedDates)];

    res.json({ bookedDates: uniqueBookedDates });
  } catch (error) {
    console.error("Error getting booked dates:", error);
    res.status(500).json({ message: "Error retrieving booked dates" });
  }
});

module.exports = router;
