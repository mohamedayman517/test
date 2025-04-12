require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const mongoose = require("mongoose");
const Message = require("./models/messageSchema")
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const helmet = require("helmet");
const methodOverride = require("method-override");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const favicon = require("serve-favicon");
const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, "uploads");
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Make io accessible to routes
app.set('io', io);

//✅ إعداد WebSockets باستخدام Socket.IO
io.on("connection", (socket) => {
  console.log("✅ New client connected");

  socket.on('connect', () => {
    console.log('✅ Connected to the server');
  });

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log(`📌 User joined room: ${roomId}`);
  });

  socket.on("joinEngineerRoom", ({ engineerId }) => {
    socket.join(`engineer-${engineerId}`);
    console.log(`📌 Engineer joined room: engineer-${engineerId}`);
  });

  socket.on("joinUserRoom", ({ userId }) => {
    socket.join(`user-${userId}`);
    console.log(`📌 User joined room: user-${userId}`);
  });

  // Add a new event to join a specific chat room with both IDs
  socket.on("joinChatRoom", ({ userId, engineerId }) => {
    // Create a consistent room ID by sorting the IDs alphabetically
    const roomId = [userId, engineerId].sort().join('-');
    socket.join(roomId);
    console.log(`📌 User joined chat room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
  });
});

app.get("/chat", async (req, res) => {
  res.render("chat");
})

// ✅ تأمين التطبيق باستخدام Helmet
if (process.env.NODE_ENV === "development") {
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://code.jquery.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11", "http://localhost:35729"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11", "http://localhost:35729"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.datatables.net", "https://cdn.jsdelivr.net/npm/sweetalert2@11"],
      },
    })
  );
}

// ✅ تفعيل LiveReload للتحديث التلقائي
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, "public"));
app.use(connectLivereload());

liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/user", express.static(path.join(__dirname, "user")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(methodOverride("_method"));
app.use("/uploads", express.static(uploadDir));

// ✅ إعداد الجلسات
app.use(
  session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true
    },
    rolling: true
  })
);

// Make session available to all routes
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ✅ Middleware للحماية من الوصول غير المصرح به
const checkAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).send("Should be logged in");
  }
  next();
};

// ✅ استيراد المسارات (Routes)
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const projectRoutes = require("./routes/projectRoutes");
const adminRoutes = require("./routes/adminRoutes");
const indexRoutes = require("./routes/indexRoutes");
const contactRoutes = require("./routes/contactRoutes");
const designersRoutes = require("./routes/designersRoutes");
const profileRoutes = require("./routes/profileRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const FavoriteRoutes = require("./routes/FavoriteRoutes");
const userProfileRoutes = require("./routes/userProfileRoutes");

app.use("/", userRoutes);
app.use("/", messageRoutes);
app.use("/", projectRoutes);
app.use("/", adminRoutes);
app.use("/", indexRoutes);
app.use("/", contactRoutes);
app.use("/", designersRoutes);
app.use("/", profileRoutes);
app.use("/", paymentRoutes);
app.use("/", FavoriteRoutes);
app.use("/", userProfileRoutes);

// ✅ الاتصال بقاعدة البيانات
mongoose
  .connect("mongodb://localhost:27017/DecorAndMore", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    httpServer.listen(port, () =>
      console.log(`🚀 Server running on http://localhost:${port}`)
    );
  })
  .catch((err) => console.error("❌ Could not connect to MongoDB", err));
