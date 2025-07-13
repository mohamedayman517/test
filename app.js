require("dotenv").config();
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const methodOverride = require("method-override");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const favicon = require("serve-favicon");
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Created uploads directory at ${uploadDir}`);
}

const httpServer = http.createServer(app);

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
  "https://decoree-moree-production.up.railway.app",
  process.env.BASE_URL,
].filter(Boolean);

app.use(
  cors({
    origin: true, // Allow all origins like localhost
    credentials: true,
  })
);

app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/user", express.static(path.join(__dirname, "user")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key-for-development",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24, // 24 hours in seconds
      autoRemove: "native",
    }),
    cookie: {
      secure: false, // Localhost settings
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 1000, // 24 hours
      httpOnly: false, // Same as localhost
      path: "/",
      domain: undefined,
    },
    rolling: true, // Reset expiration on every response
  })
);

// Make session available to all routes
app.use((req, res, next) => {
  res.locals.session = req.session;

  // Add headers to ensure cookies work
  if (process.env.NODE_ENV === "production") {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin);
  }

  // Force create new session if not exists
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.save();
  }

  // Log session information for debugging
  if (req.path.includes("AdminDashboard") || req.path.includes("login")) {
    console.log(`🔍 Session Debug - Path: ${req.path}`);
    console.log(`🔍 Session ID: ${req.sessionID}`);
    console.log(
      `🔍 Session User: ${
        req.session.user ? JSON.stringify(req.session.user) : "No user"
      }`
    );
    console.log(`🔍 Cookies: ${JSON.stringify(req.headers.cookie)}`);
    console.log(`🔍 Set-Cookie Header: ${res.getHeaders()["set-cookie"]}`);
    console.log(
      `🔍 User-Agent: ${req.headers["user-agent"]?.substring(0, 50)}...`
    );

    // Cookie issue resolved - no need for manual sending
  }

  next();
});

// Middleware to check user role and redirect if needed
app.use((req, res, next) => {
  // Skip for API routes, static files, and specific routes
  const skipPaths = [
    "/login",
    "/logout",
    "/register",
    "/profile",
    "/AdminDashboard",
    "/api",
    "/uploads",
    "/css",
    "/js",
    "/images",
    "/favicon.ico",
  ];

  // Check if the current path should be skipped
  const shouldSkip = skipPaths.some((path) => req.path.startsWith(path));

  // If it's a path we should skip or not a GET request, continue to the next middleware
  if (shouldSkip || req.method !== "GET") {
    return next();
  }

  // If user is logged in and the path is the root path
  if (req.session && req.session.user && req.path === "/") {
    // Redirect engineers to their profile page
    if (req.session.user.role === "Engineer") {
      return res.redirect(`/profile/${req.session.user.id}`);
    }
    // Redirect admins to the admin dashboard
    else if (req.session.user.role === "Admin") {
      return res.redirect("/AdminDashboard");
    }
    // Regular users (role === "user") stay on the home page
  }

  // For all other cases, continue to the next middleware
  next();
});

// Security middleware
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
        "https://js.stripe.com",
        ...(process.env.NODE_ENV === "development"
          ? ["http://localhost:35729"]
          : []),
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
      ],
      styleSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
      ],
      connectSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
        "https://*.up.railway.app",
        "https://api.stripe.com",
        "https://*.stripe.com",
        process.env.BASE_URL,
        ...(process.env.NODE_ENV === "development"
          ? ["http://localhost:35729"]
          : []),
      ],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://cdn.datatables.net",
        "https://cdn.jsdelivr.net/npm/sweetalert2@11",
        "https://js.stripe.com",
        "https://*.stripe.com",
      ],
      scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"], // Allow inline event handlers and hashes
    },
  })
);

// Live reload setup
if (process.env.NODE_ENV === "development") {
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, "public"));
  app.use(connectLivereload());

  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });
}

// Import routes
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const projectRoutes = require("./routes/projectRoutes");
const adminRoutes = require("./routes/adminRoutes");
const indexRoutes = require("./routes/indexRoutes");
const contactRoutes = require("./routes/contactRoutes");
const designersRoutes = require("./routes/designersRoutes");
const profileRoutes = require("./routes/profileRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const favoriteRoutes = require("./routes/FavoriteRoutes");
const userProfileRoutes = require("./routes/userProfileRoutes");
const authRoute = require("./routes/authRoutes");
const packageRoutes = require("./routes/packageRoutes");
const BookingRoutes = require("./routes/BookingRoutes");
const ConfirmationRoutes = require("./routes/confirmationRoutes");
const registerCustomerRoutes = require("./routes/registerCustomerRoutes");
const testRoutes = require("./routes/testRoutes");

// Use routes
app.use("/", indexRoutes);
app.use("/", userRoutes);
app.use("/", messageRoutes);
app.use("/projects", projectRoutes);
app.use("/packages", packageRoutes);
app.use("/", adminRoutes);
app.use("/", contactRoutes);
app.use("/", designersRoutes);
app.use("/", profileRoutes);
app.use("/", paymentRoutes);
app.use("/", favoriteRoutes);
app.use("/", userProfileRoutes);
app.use("/", authRoute);
app.use("/", BookingRoutes);
app.use("/", ConfirmationRoutes);
app.use("/", registerCustomerRoutes);
app.use("/test", testRoutes); // Test routes for new system

// Chat route
app.get("/chat/:userId1?/:userId2?", async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    const { userId1, userId2 } = req.params;

    if (userId1 && userId2) {
      // If both user IDs are provided, render the chat between these users
      res.render("chat", {
        userId1,
        userId2,
        user,
        isEngineer: user.role === "Engineer",
      });
    } else {
      // If no user IDs, render the chat list view
      res.render("chat", {
        user,
        isEngineer: user.role === "Engineer",
      });
    }
  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).send("Server error");
  }
});

// Add verification route with default variables
app.get("/verify", (req, res) => {
  res.render("verify", {
    error: null,
    showForm: false,
    engineerId: null,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error occurred:", err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS Error",
      message: "Origin not allowed",
      origin: req.headers.origin,
    });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

// Database connection and server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    httpServer.listen(port, () => {
      const baseUrl =
        process.env.BASE_URL ||
        `https://decoree-moree-production.up.railway.app/`;
      console.log("🔧 Environment Configuration:");
      console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`   BASE_URL: ${process.env.BASE_URL}`);
      console.log(
        `   SESSION_SECRET: ${process.env.SESSION_SECRET ? "Set" : "Not Set"}`
      );
      console.log(`   MONGO_URI: ${process.env.MONGO_URI ? "Set" : "Not Set"}`);
      console.log(
        process.env.NODE_ENV === "development"
          ? `🚀 Server running on http://localhost:${port}`
          : `🚀 Server running on ${baseUrl}`
      );
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1);
  });
