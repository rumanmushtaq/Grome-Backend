# Grome Backend Installation Guide

## Prerequisites

Before installing the Grome backend, ensure you have the following installed:

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **MongoDB** 5.0 or higher (or MongoDB Atlas account)
- **Redis** 6.0 or higher
- **Git** for version control

## Quick Start

### 1. Install Dependencies

```bash
# Install all required packages
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

### 3. Required Environment Variables

Update the `.env` file with your actual values:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/grome
MONGODB_TEST_URI=mongodb://localhost:27017/grome-test

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-different-from-jwt
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3000
NODE_ENV=development

# AWS S3 Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=grome-uploads

# Stripe Configuration (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Firebase Configuration (for push notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100

# File Upload Limits
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

### 4. Database Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option B: MongoDB Atlas (Recommended for Production)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

### 5. Redis Setup

#### Option A: Local Redis
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server

# Or if using Docker
docker run -d -p 6379:6379 --name redis redis:latest
```

#### Option B: Redis Cloud (Recommended for Production)
1. Create a Redis Cloud account
2. Create a new database
3. Get your connection details
4. Update Redis configuration in your `.env` file

### 6. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 7. Verify Installation

Once the application is running, you can verify it's working by:

1. **Check Health**: Visit `http://localhost:3000/api/v1/health` (if implemented)
2. **API Documentation**: Visit `http://localhost:3000/api/docs`
3. **Test Endpoint**: Make a test request to any public endpoint

## Development Setup

### 1. Code Quality Tools

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

### 2. Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:cov
```

### 3. Database Migrations

```bash
# Generate a new migration
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Production Deployment

### 1. Environment Preparation

```bash
# Set production environment
export NODE_ENV=production

# Update environment variables for production
# - Use production MongoDB Atlas cluster
# - Use production Redis instance
# - Use production AWS S3 bucket
# - Use production Stripe keys
```

### 2. Build Application

```bash
# Build the application
npm run build

# Verify build
ls -la dist/
```

### 3. Docker Deployment (Optional)

```bash
# Build Docker image
docker build -t grome-backend .

# Run Docker container
docker run -p 3000:3000 --env-file .env grome-backend
```

### 4. Process Management

For production, consider using a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start dist/main.js --name grome-backend

# Monitor application
pm2 monit

# View logs
pm2 logs grome-backend
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod
```

#### 2. Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping

# Check Redis logs
sudo journalctl -u redis-server
```

#### 3. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### 4. Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix project permissions
sudo chown -R $(whoami) .
```

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm run start:dev

# Run with specific debug namespace
DEBUG=grome:* npm run start:dev
```

## Next Steps

After successful installation:

1. **Explore API Documentation** at `http://localhost:3000/api/docs`
2. **Test Authentication** endpoints
3. **Create Test Users** and barbers
4. **Test Booking Flow** end-to-end
5. **Configure External Services** (Stripe, AWS S3, etc.)
6. **Set up Monitoring** and logging
7. **Deploy to Production** environment

## Support

If you encounter any issues during installation:

1. Check the **troubleshooting section** above
2. Review the **logs** for error messages
3. Verify all **environment variables** are set correctly
4. Ensure all **prerequisites** are installed
5. Check **GitHub Issues** for known problems
6. Create a **new issue** with detailed error information

---

**Happy coding! 🚀**
