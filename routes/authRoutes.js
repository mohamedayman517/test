const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/verify-account", async (req, res) => {
  try {
    const { code, engineerId } = req.body;
    console.log("Verification attempt:", { code, engineerId });

    if (!code || !engineerId) {
      console.log("Missing verification data");
      return res.status(400).json({
        success: false,
        message: "Please provide verification code",
      });
    }

    // First find the engineer
    const engineer = await User.findById(engineerId);
    console.log("Found engineer:", engineer);

    if (!engineer) {
      console.log("Engineer not found");
      return res.status(400).json({
        success: false,
        message: "Invalid verification link",
      });
    }

    // Check verification code
    if (engineer.verificationCode !== code) {
      console.log("Invalid verification code");
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Check if code is expired
    if (
      engineer.verificationCodeExpires &&
      new Date() > engineer.verificationCodeExpires
    ) {
      console.log("Verification code expired");
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
      });
    }

    // Update the engineer directly
    engineer.isVerified = true;
    engineer.verificationCode = null;
    engineer.verificationCodeExpires = null;

    await engineer.save();

    // Verify the update was successful
    const verifiedEngineer = await User.findById(engineerId);
    console.log(
      "Verification status after update:",
      verifiedEngineer.isVerified
    );

    if (!verifiedEngineer.isVerified) {
      console.log("Failed to update verification status");
      return res.status(500).json({
        success: false,
        message: "Failed to verify account",
      });
    }

    console.log("Engineer verified successfully");
    return res.json({
      success: true,
      message: "Account verified successfully",
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying account",
    });
  }
});

// Verify page route
router.get("/verify", async (req, res) => {
  try {
    // Get engineerId from URL parameters
    const engineerId = req.query.engineerId;
    console.log("Request URL:", req.url);
    console.log("Request Query:", req.query);
    console.log("Attempting to verify engineer with ID:", engineerId);

    // If no engineerId is provided, redirect to login page
    if (!engineerId) {
      console.log("No engineerId provided - Redirecting to login page");
      return res.redirect("/login");
    }

    // Find the engineer
    const engineer = await User.findOne({
      _id: engineerId,
      isApproved: true,
    });

    console.log("Found engineer:", engineer);

    if (!engineer) {
      console.log("Engineer not found or not approved");
      return res.render("verify", {
        error: "Invalid verification link - Engineer not found or not approved",
        showForm: false,
        engineerId: null,
      });
    }

    // Check if already verified
    if (engineer.isVerified) {
      console.log("Engineer already verified");
      return res.render("verify", {
        error: "Your account is already verified. Please login.",
        showForm: false,
        engineerId: null,
      });
    }

    // If we reach here, everything is valid - show verification form
    console.log(
      "Engineer eligible for verification - Showing verification form"
    );
    return res.render("verify", {
      error: null,
      showForm: true,
      engineerId: engineerId,
    });
  } catch (error) {
    console.error("Error in verification route:", error);
    return res.render("verify", {
      error: "An unexpected error occurred",
      showForm: false,
      engineerId: null,
    });
  }
});

// Update login route to check verification status
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // For engineers, check approval and verification status
    if (user.role === "Engineer") {
      if (!user.isApproved) {
        return res.status(403).json({
          message:
            "Your account is pending admin approval. Please wait for approval before logging in.",
        });
      }
      if (!user.isVerified) {
        return res.status(403).json({
          message:
            "Please verify your account using the code sent to your email.",
        });
      }
    }

    // ✅ Check if subscription is expired
    const now = new Date();
    if (
      user.role === "Engineer" &&
      user.hasPaidSubscription &&
      user.subscriptionEndDate &&
      new Date(user.subscriptionEndDate) < now
    ) {
      return res.json({
        success: false,
        subscriptionExpired: true,
        message: "Your subscription has expired. Please renew to continue.",
        engineerId: user._id,
        redirectTo: `/subscription-expired?engineerId=${user._id}`,
      });
    }

    // Create session
    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    // Set redirectPath based on user role
    let redirectPath = "/";
    if (user.role === "Engineer") {
      redirectPath = `/profile/${user._id}`;
    } else if (user.role === "Admin") {
      redirectPath = "/AdminDashboard";
    } else if (user.role === "user") {
      redirectPath = "/"; // Regular users go to home page
    }

    res.json({
      success: true,
      message: "Login successful",
      redirectPath: redirectPath,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

router.get("/subscription-expired", async (req, res) => {
  const { engineerId } = req.query;

  if (!engineerId) return res.redirect("/login");

  const engineer = await User.findById(engineerId);

  if (!engineer) return res.redirect("/login");

  res.render("subscriptionExpired", {
    engineerName: `${engineer.firstName} ${engineer.lastName}`,
    engineerId: engineer._id,
  });
});

router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      idCardPhoto,
      specialties,
    } = req.body;

    console.log("REGISTER BODY:", req.body);

    // فحص الإيميل في كلا النموذجين لمنع التكرار
    console.log("🔍 [Engineer Registration] Checking email:", email);
    const existingUser = await User.findOne({ email });
    const existingClient = await Client.findOne({ email });

    console.log(
      "👤 [Engineer Registration] Existing User:",
      existingUser ? "Found" : "Not found"
    );
    console.log(
      "👥 [Engineer Registration] Existing Client:",
      existingClient ? "Found" : "Not found"
    );

    if (existingUser || existingClient) {
      console.log(
        "❌ [Engineer Registration] Email already exists, rejecting registration"
      );
      return res.status(400).json({
        message:
          "هذا البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.",
      });
    }

    console.log(
      "✅ [Engineer Registration] Email is unique, proceeding with registration"
    );

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let specialtiesArr = [];
    if (specialties) {
      if (Array.isArray(specialties)) {
        specialtiesArr = specialties;
      } else {
        specialtiesArr = [specialties];
      }
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      phone,
      idCardPhoto,
      specialties: specialtiesArr,
      isApproved: role === "Engineer" ? false : true,
      isVerified: false,
      hasPaidSubscription: false,
    });

    await user.save();

    // For engineers, redirect to payment policy page
    if (role === "Engineer") {
      return res.json({
        success: true,
        message: "Registration successful. Please review payment policy.",
        redirectTo: `/payment-policy?engineerId=${user._id}`,
      });
    }

    // For other roles, redirect to login
    res.json({
      success: true,
      message: "Registration successful",
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error during registration" });
  }
});

// Add route for payment policy page
router.get("/payment-policy", async (req, res) => {
  try {
    const engineerId = req.query.engineerId;

    if (!engineerId) {
      return res.redirect("/login");
    }

    const engineer = await User.findOne({
      _id: engineerId,
      role: "Engineer",
    });

    if (!engineer) {
      return res.redirect("/login");
    }

    res.render("paymentPolicy", {
      engineerId: engineerId,
    });
  } catch (error) {
    console.error("Error in payment policy route:", error);
    res.redirect("/login");
  }
});

// Payment Engineer Page Route
router.get("/payment-engineer", async (req, res) => {
  try {
    console.log("GET /payment-engineer - Query:", req.query);
    const engineerId = req.query.engineerId;

    if (!engineerId) {
      console.log("No engineerId provided");
      return res.redirect("/login");
    }

    const engineer = await User.findById(engineerId);
    console.log("Found engineer:", engineer);

    if (!engineer) {
      console.log("Engineer not found");
      return res.redirect("/login");
    }

    // Check role case-insensitively
    if (!["engineer", "Engineer"].includes(engineer.role)) {
      console.log("Invalid role:", engineer.role);
      return res.redirect("/login");
    }

    console.log(
      "Rendering payment page for:",
      engineer.firstName,
      engineer.lastName
    );
    res.render("paymentEngineer", {
      engineerId: engineerId,
      engineerName: `${engineer.firstName} ${engineer.lastName}`,
      title: "Payment - Decor And More",
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("Payment page error:", error);
    res.redirect("/login");
  }
});

router.post("/create-payment-intent", async (req, res) => {
  try {
    const { engineerId } = req.body;

    const engineer = await User.findById(engineerId);
    if (!engineer) {
      return res.status(404).json({ error: "Engineer not found" });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 200000,
      currency: "egp",
      metadata: {
        engineerId: engineerId,
        engineerEmail: engineer.email,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.post("/payment-engineer", async (req, res) => {
  try {
    const { engineerId, paymentMethodId } = req.body;

    if (!engineerId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment information",
      });
    }

    const engineer = await User.findById(engineerId);

    if (!engineer) {
      return res.status(404).json({
        success: false,
        message: "Engineer not found",
      });
    }

    try {
      // Create a customer
      const customer = await stripe.customers.create({
        payment_method: paymentMethodId,
        email: engineer.email,
        name: `${engineer.firstName} ${engineer.lastName}`,
        metadata: {
          engineerId: engineer._id.toString(),
        },
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: "price_1RaPEKF11C4VZmHAUNPJ6Kzi",
          },
        ],
        payment_settings: {
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
      });

      // Update engineer's subscription status
      engineer.hasPaidSubscription = true;
      engineer.subscriptionStartDate = new Date();
      engineer.subscriptionEndDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      engineer.stripeCustomerId = customer.id;
      engineer.stripeSubscriptionId = subscription.id;
      await engineer.save();

      // Send success response
      res.json({
        success: true,
        message: "Subscription activated successfully",
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startDate: engineer.subscriptionStartDate,
          endDate: engineer.subscriptionEndDate,
        },
      });
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return res.status(400).json({
        success: false,
        message: stripeError.message,
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing payment",
    });
  }
});

// Webhook handler for asynchronous events
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("PaymentIntent succeeded:", paymentIntent.id);
          // Update engineer's payment status if needed
          break;

        case "payment_intent.payment_failed":
          const failedPayment = event.data.object;
          console.log("Payment failed:", failedPayment.id);
          // Handle failed payment
          break;

        case "customer.subscription.deleted":
          const subscription = event.data.object;
          await User.findOneAndUpdate(
            { stripeSubscriptionId: subscription.id },
            {
              hasPaidSubscription: false,
              subscriptionEndDate: new Date(),
            }
          );
          break;

        case "invoice.payment_succeeded":
          const invoice = event.data.object;
          if (invoice.billing_reason === "subscription_create") {
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription
            );
            await User.findOneAndUpdate(
              { stripeCustomerId: invoice.customer },
              {
                hasPaidSubscription: true,
                subscriptionStartDate: new Date(),
                subscriptionEndDate: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ),
              }
            );
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Error processing webhook:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

router.post("/cancel-registration", async (req, res) => {
  try {
    const { engineerId } = req.body;

    if (!engineerId) {
      return res.status(400).json({
        success: false,
        message: "Engineer ID is required",
      });
    }

    // Find and delete the engineer
    const result = await User.findByIdAndDelete(engineerId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Engineer not found",
      });
    }

    res.json({
      success: true,
      message: "Registration cancelled successfully",
    });
  } catch (error) {
    console.error("Cancellation error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling registration",
    });
  }
});

module.exports = router;
