"# 🏠 Decore & More - Interior Design Platform

A comprehensive interior design platform connecting clients with professional engineers and designers.

## 🚀 **Recent Major Refactor**

This project has been completely refactored with modern best practices:

- ✅ **Organized Route Structure** - Clean separation between API and Web routes
- ✅ **Enhanced Security** - Rate limiting, validation, and secure file uploads
- ✅ **English Interface** - Professional international-ready interface
- ✅ **Improved Architecture** - Controllers, Services, and Middleware layers
- ✅ **Comprehensive Documentation** - Complete guides and migration docs

## 🏗️ **Project Structure**

```
├── controllers/          # Request handlers
├── services/            # Business logic layer
├── middleware/          # Security and validation
├── routes/
│   ├── api/            # API endpoints (/api/*)
│   └── web/            # Web pages (/*.html)
├── models/             # Database schemas
├── views/              # EJS templates
├── public/             # Static assets
└── utils/              # Helper utilities
```

## 🔧 **Features**

### 🔐 **Authentication System**

- User registration and login
- Email verification
- Password reset functionality
- Role-based access control (Admin, Engineer, Client)

### 👥 **User Management**

- Engineer profiles and portfolios
- Client management
- Admin dashboard
- User approval system

### 🏗️ **Project Management**

- Project creation and showcase
- Image upload and gallery
- Project categorization
- Engineer project portfolios

### 📦 **Package System**

- Service packages by event type
- Pricing management
- Package customization
- Booking integration

### 📅 **Booking System**

- Service booking workflow
- Payment integration (Stripe)
- Booking management
- Status tracking

### 💬 **Messaging System**

- Client-Engineer communication
- Real-time messaging
- Conversation management

## 🛠️ **Technology Stack**

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Express Sessions
- **File Upload**: Multer
- **Payment**: Stripe
- **Email**: Nodemailer
- **Template Engine**: EJS
- **Styling**: CSS, Bootstrap

## 🚀 **Getting Started**

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/mohamedayman517/test.git
   cd test
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/decore-more
   SESSION_SECRET=your-session-secret
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. **Start the application**

   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📚 **API Documentation**

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### User Management

- `GET /api/users/engineers` - Get engineers list
- `GET /api/users/profile/:userId` - Get user profile
- `PUT /api/users/profile/:userId` - Update user profile

### Projects

- `GET /api/projects` - Get projects list
- `POST /api/projects` - Create new project
- `GET /api/projects/:projectId` - Get project details
- `PUT /api/projects/:projectId` - Update project

### Packages

- `GET /api/packages` - Get packages list
- `POST /api/packages` - Create new package
- `GET /api/packages/event-type/:eventType` - Get packages by event type

### Bookings

- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get bookings list
- `PUT /api/bookings/:bookingId/status` - Update booking status

## 🔒 **Security Features**

- **Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive data validation
- **File Upload Security** - Secure file handling
- **Authentication Middleware** - Role-based access control
- **Session Management** - Secure session handling

## 📖 **Documentation**

- [`REFACTOR_GUIDE.md`](./REFACTOR_GUIDE.md) - Complete refactor documentation
- [`ROUTE_MAPPING.md`](./ROUTE_MAPPING.md) - Route migration guide
- [`MIGRATION_CHECKLIST.md`](./MIGRATION_CHECKLIST.md) - Migration checklist
- [`FUNCTIONALITY_VERIFICATION.md`](./FUNCTIONALITY_VERIFICATION.md) - Feature verification

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Author**

**Mohamed Ayman**

- GitHub: [@mohamedayman517](https://github.com/mohamedayman517)

## 🙏 **Acknowledgments**

- Thanks to all contributors who helped improve this project
- Special thanks to the open-source community for the amazing tools and libraries

---

**🎉 Ready for production deployment!**"
