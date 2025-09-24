# Grome Backend Architecture

## System Overview

The Grome backend is built as a **scalable, modular NestJS application** following clean architecture principles. It's designed to handle a barbershop booking platform with real-time features, payment processing, and comprehensive user management.

## 🏗️ Architecture Layers

### 1. Presentation Layer (Controllers)
- **REST API Controllers** with Swagger documentation
- **WebSocket Gateway** for real-time communication
- **Request/Response DTOs** with validation
- **Error Handling** with proper HTTP status codes

### 2. Business Logic Layer (Services)
- **Domain Services** for business rules
- **Use Case Implementation** for complex workflows
- **Transaction Management** for data consistency
- **External Service Integration** (Stripe, AWS S3, etc.)

### 3. Data Access Layer (Repositories)
- **Mongoose Schemas** with proper indexing
- **Database Queries** optimized for performance
- **Data Validation** at the schema level
- **Migration Support** for schema changes

### 4. Infrastructure Layer
- **Configuration Management** with environment variables
- **Logging & Monitoring** with Winston and Sentry
- **Caching** with Redis
- **Queue Management** with BullMQ

## 📊 Database Design

### Core Entities

#### User Schema
```typescript
{
  email: string (unique, sparse)
  phone: string (unique, sparse)
  passwordHash: string
  name: string
  role: 'customer' | 'barber' | 'admin'
  isVerified: boolean
  verification: {
    status: 'pending' | 'approved' | 'rejected'
    idDocUrl: string
    certificateUrls: string[]
    notes: string
  }
  preferences: {
    notifications: { email, push, sms }
    language: string
    timezone: string
  }
}
```

#### Barber Schema
```typescript
{
  userId: ObjectId (ref: User)
  location: GeoJSON Point
  services: [{ serviceId, price, duration }]
  rating: number (0-5)
  reviewsCount: number
  availability: {
    monday: { isAvailable, startTime, endTime, breaks }
    // ... other days
  }
  isOnline: boolean
  commissionRate: number
  serviceRadius: number
}
```

#### Booking Schema
```typescript
{
  customerId: ObjectId (ref: User)
  barberId: ObjectId (ref: Barber)
  services: [{ serviceId, price, duration, name }]
  scheduledAt: Date
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  location: GeoJSON Point (optional)
  payment: {
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    amount: number
    stripePaymentId: string
    commission: number
    payoutAmount: number
  }
}
```

### Indexing Strategy

#### Performance Indexes
- **Geospatial**: `2dsphere` index on barber.location for nearby searches
- **Compound**: `{ barberId: 1, scheduledAt: 1 }` for booking queries
- **Text Search**: Full-text index on service names and descriptions
- **TTL**: Automatic cleanup for refresh tokens and temporary data

#### Query Optimization
- **Pagination**: Cursor-based for large datasets
- **Aggregation Pipelines**: For complex analytics queries
- **Projection**: Select only required fields
- **Lean Queries**: Return plain JavaScript objects

## 🔐 Security Architecture

### Authentication Flow
1. **User Registration/Login** with email/phone + password
2. **JWT Access Token** (15 minutes) for API access
3. **Refresh Token** (30 days) stored securely in database
4. **Token Rotation** on refresh for enhanced security
5. **Device Tracking** for suspicious activity detection

### Authorization Model
- **Role-Based Access Control (RBAC)** with three roles
- **Resource-Level Permissions** for fine-grained access
- **Route Guards** for endpoint protection
- **Custom Decorators** for clean permission checks

### Data Protection
- **Password Hashing** with bcrypt (12 rounds)
- **Input Validation** with class-validator
- **SQL Injection Prevention** with Mongoose ODM
- **XSS Protection** with helmet middleware

## 🔄 Real-time Architecture

### Socket.IO Implementation
- **Redis Adapter** for horizontal scaling
- **Room Management** for user-specific channels
- **Event Broadcasting** for live updates
- **Connection Management** with heartbeat

### Real-time Features
- **Live Booking Updates** (status changes, ETA)
- **Instant Messaging** between customers and barbers
- **Push Notifications** for important events
- **Live Location Tracking** for on-the-way bookings

## 💳 Payment Processing

### Stripe Integration
- **Payment Intents** for secure card processing
- **Webhook Handling** for payment status updates
- **Idempotency Keys** for duplicate prevention
- **Commission Calculation** and payout management

### Payment Flow
1. **Create Payment Intent** with booking amount
2. **Client-side Payment** with Stripe Elements
3. **Webhook Processing** for confirmation
4. **Commission Deduction** and barber payout
5. **Refund Processing** for cancellations

## 📱 Background Job System

### BullMQ Implementation
- **Redis-backed Queues** for job persistence
- **Job Retry Logic** with exponential backoff
- **Job Prioritization** for urgent tasks
- **Dead Letter Queues** for failed jobs

### Job Types
- **Email Notifications** (welcome, booking confirmations)
- **Push Notifications** (FCM integration)
- **Payment Webhooks** (Stripe event processing)
- **Report Generation** (analytics, financial reports)
- **Cleanup Tasks** (expired tokens, old data)

## 🚀 Scalability Considerations

### Horizontal Scaling
- **Stateless Services** for load balancer distribution
- **Redis Clustering** for session and cache distribution
- **MongoDB Sharding** for database scaling
- **CDN Integration** for static asset delivery

### Performance Optimization
- **Connection Pooling** for database connections
- **Query Caching** with Redis
- **Response Compression** with gzip
- **Database Indexing** for fast queries

### Monitoring & Observability
- **Application Metrics** with Prometheus
- **Error Tracking** with Sentry
- **Log Aggregation** with ELK stack
- **Health Checks** for service monitoring

## 🔧 Development Workflow

### Code Organization
- **Feature-based Modules** for maintainability
- **Shared Utilities** in common directory
- **Type Safety** with TypeScript
- **Code Standards** with ESLint and Prettier

### Testing Strategy
- **Unit Tests** for business logic
- **Integration Tests** for API endpoints
- **E2E Tests** for critical user flows
- **Load Testing** for performance validation

### Deployment Pipeline
- **Docker Containerization** for consistent environments
- **CI/CD Pipeline** with GitHub Actions
- **Environment Management** with configuration files
- **Database Migrations** for schema changes

## 📈 Future Enhancements

### Planned Features
- **Machine Learning** for demand prediction
- **Advanced Analytics** with data visualization
- **Multi-language Support** with i18n
- **Mobile App Integration** with deep linking

### Technical Improvements
- **GraphQL API** for flexible data fetching
- **Event Sourcing** for audit trails
- **Microservices Migration** for independent scaling
- **Kubernetes Orchestration** for container management

---

This architecture provides a solid foundation for a scalable, maintainable, and secure barbershop booking platform that can grow with business needs while maintaining high performance and reliability.
