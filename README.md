# Grome Backend - Barbershop Booking Platform

A comprehensive NestJS backend for a barbershop booking platform with real-time features, payment processing, and scalable architecture.

## 🏗️ Architecture Overview

This backend follows a **modular, feature-based architecture** with clean separation of concerns:

- **API Layer**: NestJS controllers with Swagger documentation
- **Business Logic**: Services with comprehensive business rules
- **Data Layer**: Mongoose schemas with MongoDB
- **Authentication**: JWT with refresh token rotation
- **Real-time**: Socket.IO with Redis adapter
- **Background Jobs**: BullMQ with Redis
- **File Storage**: AWS S3 with presigned URLs

## 📁 Project Structure

```
src/
├── modules/                    # Feature modules
│   ├── auth/                  # Authentication & authorization
│   ├── users/                 # User management
│   ├── barbers/               # Barber profiles & management
│   ├── services/              # Service catalog
│   ├── bookings/              # Booking management
│   ├── payments/              # Payment processing (Stripe)
│   ├── chat/                  # Real-time messaging
│   ├── notifications/         # Push/email notifications
│   ├── wallet/                # Wallet & transactions
│   ├── admin/                 # Admin operations
│   ├── media/                 # File uploads (S3)
│   ├── search/                # Search & filtering
│   ├── promo-codes/           # Promotional codes
│   └── reports/               # Analytics & reporting
├── schemas/                   # Mongoose schemas
├── dto/                       # Data Transfer Objects
├── common/                    # Shared utilities
│   ├── guards/                # Auth guards
│   ├── decorators/            # Custom decorators
│   └── logger/                # Logging configuration
└── config/                    # Configuration files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- AWS S3 bucket (for file storage)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd grome-backend
npm install
```

2. **Environment setup:**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Required environment variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/grome

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=grome-uploads

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

4. **Start the application:**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 🔐 Authentication System

### Features
- **JWT Access Tokens** (15 minutes expiry)
- **Refresh Token Rotation** (30 days expiry)
- **Device Tracking** for security
- **Role-Based Access Control** (Customer, Barber, Admin)
- **Password Reset** with secure tokens
- **Email/Phone Verification**

### API Endpoints
```http
POST /api/v1/auth/signup          # Register new user
POST /api/v1/auth/signin          # Sign in user
POST /api/v1/auth/refresh         # Refresh access token
POST /api/v1/auth/signout         # Sign out user
POST /api/v1/auth/forgot-password # Request password reset
POST /api/v1/auth/reset-password  # Reset password
POST /api/v1/auth/verify-email    # Verify email address
```

## 👥 User Management

### User Roles
- **Customer**: Book appointments, manage profile
- **Barber**: Accept bookings, manage availability, earn commissions
- **Admin**: Manage users, moderate content, view analytics

### Key Features
- Profile management with preferences
- Barber verification workflow
- User activation/deactivation
- Comprehensive user search and filtering

## 💇‍♂️ Barber System

### Features
- **Geolocation-based Discovery** with 2dsphere indexing
- **Availability Management** with weekly schedules
- **Service Catalog** with pricing and duration
- **Real-time Status** (online/offline)
- **Commission Tracking** for payouts
- **Rating & Review System**

### Search & Discovery
```http
GET /api/v1/barbers/search?lat=40.7128&lng=-74.0060&radius=10&service=haircut
GET /api/v1/barbers/nearby?lat=40.7128&lng=-74.0060&radius=5
```

## 📅 Booking System

### Booking Flow
1. **Search Barbers** by location and services
2. **Select Time Slot** based on barber availability
3. **Create Booking** with special requests
4. **Payment Processing** via Stripe
5. **Real-time Updates** via Socket.IO
6. **Completion & Review** process

### Booking States
- `requested` → `accepted` → `in_progress` → `completed`
- `cancelled` (at any stage)

### API Endpoints
```http
POST /api/v1/bookings              # Create booking
GET /api/v1/bookings               # Get user bookings
GET /api/v1/bookings/:id           # Get booking details
PATCH /api/v1/bookings/:id/accept  # Accept booking (barber)
PATCH /api/v1/bookings/:id/start   # Start booking (barber)
PATCH /api/v1/bookings/:id/complete # Complete booking (barber)
PATCH /api/v1/bookings/:id/cancel  # Cancel booking
```

## 💳 Payment System

### Integration
- **Stripe Payment Processing** with webhooks
- **Commission Calculation** for barbers
- **Refund Management** with proper tracking
- **Payout Scheduling** to barber accounts

### Security
- **Webhook Verification** with Stripe signatures
- **Idempotency Keys** for duplicate prevention
- **PCI Compliance** through Stripe

## 💬 Real-time Communication

### Socket.IO Features
- **Real-time Chat** between customers and barbers
- **Live Booking Updates** (status changes, ETA)
- **Push Notifications** for important events
- **Redis Adapter** for horizontal scaling

### Chat Features
- Message history with pagination
- File/image sharing
- Read receipts and typing indicators
- Message reactions and threading

## 🔔 Notification System

### Channels
- **Push Notifications** (Firebase FCM)
- **Email Notifications** (SMTP/SES)
- **SMS Notifications** (Twilio)
- **In-app Notifications**

### Notification Types
- Booking confirmations and updates
- Payment receipts and failures
- New messages and reviews
- System announcements

## 💰 Wallet System

### Features
- **Balance Management** with transaction history
- **Commission Tracking** for barbers
- **Payout Processing** to bank accounts
- **Promo Code Integration**
- **Transaction Security** with audit trails

## 🔍 Search & Discovery

### Search Capabilities
- **Geolocation Search** with radius filtering
- **Service-based Filtering** by category and price
- **Rating & Review Filtering**
- **Availability-based Search**
- **Full-text Search** with MongoDB Atlas Search

## 📊 Admin Dashboard

### Management Features
- **User Management** (activation, verification)
- **Barber Verification** workflow
- **Booking Analytics** and reporting
- **Payment Monitoring** and reconciliation
- **System Configuration** and settings

## 🛠️ Development

### Available Scripts
```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npm run start:prod     # Start production server
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Database Migrations
```bash
npm run migration:generate  # Generate new migration
npm run migration:run       # Run pending migrations
npm run migration:revert    # Revert last migration
```

## 📈 Monitoring & Observability

### Logging
- **Winston Logger** with multiple transports
- **Structured Logging** with correlation IDs
- **Error Tracking** with Sentry integration

### Metrics
- **Request/Response Metrics**
- **Database Query Performance**
- **Redis Cache Hit Rates**
- **Queue Processing Metrics**

## 🚀 Deployment

### Docker Support
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
# ... build steps

FROM node:18-alpine AS production
# ... production setup
```

### Environment Configuration
- **Development**: Local MongoDB and Redis
- **Staging**: Cloud MongoDB Atlas and Redis
- **Production**: Clustered setup with load balancing

## 🔒 Security Features

### Authentication & Authorization
- **JWT with Refresh Token Rotation**
- **Role-based Access Control (RBAC)**
- **Rate Limiting** per IP and user
- **Device Tracking** and management

### Data Protection
- **Password Hashing** with bcrypt (12 rounds)
- **Input Validation** with class-validator
- **SQL Injection Prevention** with Mongoose
- **XSS Protection** with helmet

### API Security
- **CORS Configuration** with whitelist
- **Request Size Limits**
- **File Upload Validation**
- **Webhook Signature Verification**

## 📚 API Documentation

### Swagger/OpenAPI
- **Interactive Documentation** at `/api/docs`
- **Request/Response Examples**
- **Authentication Testing**
- **Schema Validation**

### API Versioning
- **URL-based Versioning** (`/api/v1/`)
- **Backward Compatibility** strategy
- **Deprecation Notices** for old versions

## 🤝 Contributing

### Code Standards
- **TypeScript** with strict mode
- **ESLint** and **Prettier** configuration
- **Conventional Commits** for git messages
- **Unit Tests** with Jest
- **E2E Tests** with Supertest

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Run linting and tests
4. Submit PR with description
5. Code review and merge

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- **Documentation**: Check `/api/docs` for API reference
- **Issues**: Create GitHub issue for bugs
- **Discussions**: Use GitHub discussions for questions

---

**Built with ❤️ using NestJS, MongoDB, and modern TypeScript practices.**
