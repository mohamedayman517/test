# 🗺️ Route Mapping Guide - Old vs New System

## 📋 **Complete Route Migration Map**

### 🔐 **Authentication Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/verify-account` | `/api/auth/verify-account` | - | POST | Verify email with code |
| `/login` | `/api/auth/login` | `/login` | POST/GET | User login |
| `/register` | `/api/auth/register` | `/register` | POST/GET | User registration |
| `/logout` | `/api/auth/logout` | - | POST | User logout |
| `/forgot-password` | `/api/auth/forgot-password` | `/forgot-password` | POST/GET | Password reset request |
| `/reset-password` | `/api/auth/reset-password` | `/reset-password` | POST/GET | Password reset |
| `/verify-email` | `/api/auth/verify-email` | `/verify-email` | POST/GET | Email verification |

### 👥 **User Management Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/profile/:id` | `/api/users/profile/:userId` | `/users/profile` | GET/PUT | User profile |
| `/engineers` | `/api/users/engineers` | `/engineers` | GET | Engineers listing |
| `/approve-engineer` | `/api/users/engineers/:engineerId/approve` | - | PUT | Approve engineer |
| `/user-stats` | `/api/users/stats` | - | GET | User statistics |

### 🏗️ **Project Management Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/projects/create` | `/api/projects` | `/engineer/projects/create` | POST/GET | Create project |
| `/projects` | `/api/projects` | `/projects` | GET | List projects |
| `/projects/:id` | `/api/projects/:projectId` | `/project/:projectId` | GET/PUT/DELETE | Project details |
| `/projects/engineer/:id` | `/api/projects/engineer/:engineerId` | - | GET | Engineer projects |

### 📦 **Package Management Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/packages` | `/api/packages` | `/packages` | GET/POST | Package management |
| `/packages/:id` | `/api/packages/:packageId` | `/package/:packageId` | GET/PUT/DELETE | Package details |
| `/packages/event/:type` | `/api/packages/event-type/:eventType` | - | GET | Packages by event type |
| `/packages/engineer/:id` | `/api/packages/engineer/:engineerId` | - | GET | Engineer packages |

### 📅 **Booking Management Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/booking` | `/api/bookings` | `/booking` | POST/GET | Create booking / Booking page |
| `/bookings` | `/api/bookings` | `/admin/bookings` | GET | List all bookings |
| `/bookings/:id` | `/api/bookings/:bookingId` | - | GET/PUT/DELETE | Booking details |
| `/engineer-bookings/:id` | `/api/bookings/engineer/:engineerId` | `/engineer/bookings` | GET | Engineer bookings |
| `/client-bookings/:id` | `/api/bookings/client/:clientId` | `/client/bookings` | GET | Client bookings |

### 💳 **Payment Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/create-payment-intent` | `/api/payments/create-intent` | - | POST | Create payment intent |
| `/confirm-payment` | `/api/payments/confirm` | - | POST | Confirm payment |
| `/webhook` | `/api/payments/webhook` | - | POST | Stripe webhook |
| `/payment/:id` | `/api/payments/:paymentId` | - | GET | Payment details |

### 💬 **Message Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/messages` | `/api/messages` | `/messages` | POST/GET | Send/view messages |
| `/conversation/:id1/:id2` | `/api/messages/conversation/:userId/:engineerId` | - | GET | Get conversation |
| `/conversations` | `/api/messages/conversations` | - | GET | User conversations |
| `/mark-read` | `/api/messages/mark-read` | - | PUT | Mark as read |

### 🛠️ **Admin Routes**

| Old Route | New API Route | New Web Route | Method | Description |
|-----------|---------------|---------------|---------|-------------|
| `/AdminDashboard` | `/api/admin/dashboard` | `/admin/dashboard` | GET | Admin dashboard |
| `/admin/engineers` | `/api/admin/engineers` | `/admin/engineers` | GET | Manage engineers |
| `/admin/clients` | `/api/admin/clients` | `/admin/clients` | GET | Manage clients |
| `/admin/stats` | `/api/admin/stats/system` | `/admin/analytics` | GET | System statistics |

### 🌐 **Public Pages**

| Old Route | New Web Route | Description |
|-----------|---------------|-------------|
| `/` | `/` | Home page |
| `/about` | `/about` | About page |
| `/services` | `/services` | Services page |
| `/contact` | `/contact` | Contact page |
| `/privacy` | `/privacy` | Privacy policy |
| `/terms` | `/terms` | Terms of service |

## 🔄 **Migration Instructions**

### **For Frontend Developers:**

1. **Update API calls** to use new endpoints:
   ```javascript
   // Old
   fetch('/verify-account', { ... })
   
   // New
   fetch('/api/auth/verify-account', { ... })
   ```

2. **Update form actions** for web routes:
   ```html
   <!-- Old -->
   <form action="/login" method="POST">
   
   <!-- New -->
   <form action="/api/auth/login" method="POST">
   ```

3. **Update navigation links**:
   ```html
   <!-- Old -->
   <a href="/AdminDashboard">Admin</a>
   
   <!-- New -->
   <a href="/admin/dashboard">Admin</a>
   ```

### **For Backend Integration:**

1. **Update redirects** in controllers:
   ```javascript
   // Old
   res.redirect('/AdminDashboard')
   
   // New
   res.redirect('/admin/dashboard')
   ```

2. **Update middleware** to use new auth system:
   ```javascript
   // Old
   const { isAuthenticated } = require('./middleware/auth')
   
   // New
   const { requireAuth, requireAdmin } = require('./middleware/auth')
   ```

## 🚀 **Benefits of New Structure**

### 🎯 **Clear Separation**
- **API routes** (`/api/*`) for data operations
- **Web routes** for page rendering
- **Role-based routing** for different user types

### 🔒 **Enhanced Security**
- Consistent authentication middleware
- Rate limiting on all endpoints
- Input validation and sanitization

### 📊 **Better Organization**
- Logical grouping by functionality
- Consistent naming conventions
- Easy to maintain and extend

### 🌍 **Professional Standards**
- RESTful API design
- Standard HTTP methods
- Clear endpoint structure

---

**🎉 All routes have been successfully migrated to the new organized system!**
