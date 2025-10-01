# Service Management System

## Overview
A comprehensive service management system where admins create base services and barbers customize their offerings with pricing, availability, and additional details.

## Architecture

### Admin Service Management
- **Creates base services** with title, base price, icon, category, and tags
- **Manages service lifecycle** (activate/deactivate, update, delete)
- **Controls service availability** across the platform

### Barber Service Customization
- **Selects services** from admin-created base services
- **Sets custom pricing** for each service
- **Adds custom details** like description, images, pricing tiers
- **Configures availability** and requirements
- **Manages service portfolio** (add/remove/update services)

## API Endpoints

### Admin Service Management

#### Create Service
```http
POST /api/v1/admin/services
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Haircut",
  "basePrice": 25.00,
  "icon": "https://example.com/haircut-icon.svg",
  "category": "haircut",
  "tags": ["hair", "cut", "styling"]
}
```

#### Get All Services
```http
GET /api/v1/admin/services
Authorization: Bearer <admin-token>
```

#### Update Service
```http
PUT /api/v1/admin/services/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Premium Haircut",
  "basePrice": 30.00,
  "description": "Professional haircut with styling",
  "images": ["https://example.com/haircut1.jpg"],
  "isActive": true,
  "sortOrder": 1
}
```

#### Activate/Deactivate Service
```http
PUT /api/v1/admin/services/:id/activate
PUT /api/v1/admin/services/:id/deactivate
Authorization: Bearer <admin-token>
```

### Barber Service Management

#### Get Barber Services
```http
GET /api/v1/barber/services
Authorization: Bearer <barber-token>
```

#### Add Service to Barber
```http
POST /api/v1/barber/services/add
Authorization: Bearer <barber-token>
Content-Type: application/json

{
  "serviceId": "64a1b2c3d4e5f6789012345",
  "price": 30.00
}
```

#### Update Barber Service
```http
PUT /api/v1/barber/services/update
Authorization: Bearer <barber-token>
Content-Type: application/json

{
  "serviceId": "64a1b2c3d4e5f6789012345",
  "price": 35.00,
  "description": "Premium haircut with beard trim",
  "images": ["https://example.com/my-haircut1.jpg"],
  "pricingTiers": [
    {
      "name": "Basic",
      "price": 25.00,
      "duration": 30,
      "description": "Simple haircut"
    },
    {
      "name": "Premium",
      "price": 35.00,
      "duration": 45,
      "description": "Haircut with styling"
    }
  ],
  "requirements": {
    "requiresConsultation": true,
    "requiresPreparation": false,
    "preparationTime": 0,
    "equipment": ["scissors", "comb", "mirror"],
    "skills": ["cutting", "styling"]
  },
  "availability": {
    "isAvailable": true,
    "availableFrom": "2024-01-01",
    "availableTo": "2024-12-31",
    "maxBookingsPerDay": 10
  }
}
```

#### Remove Service from Barber
```http
PUT /api/v1/barber/services/remove
Authorization: Bearer <barber-token>
Content-Type: application/json

{
  "serviceId": "64a1b2c3d4e5f6789012345"
}
```

#### Get Available Services
```http
GET /api/v1/barber/services/available
Authorization: Bearer <barber-token>
```

## Data Models

### Admin Service Creation
```typescript
{
  title: string;           // Service name
  basePrice: number;       // Base price
  icon: string;           // Icon URL
  category: ServiceCategory; // Service category
  tags: string[];         // Service tags
}
```

### Barber Service Customization
```typescript
{
  serviceId: string;      // MongoDB ObjectId
  price: number;          // Custom price
  description?: string;   // Custom description
  images?: string[];      // Custom images
  pricingTiers?: {        // Custom pricing tiers
    name: string;
    price: number;
    duration: number;
    description?: string;
  }[];
  requirements?: {        // Service requirements
    requiresConsultation: boolean;
    requiresPreparation: boolean;
    preparationTime: number;
    equipment: string[];
    skills: string[];
  };
  availability?: {        // Service availability
    isAvailable: boolean;
    availableFrom?: string;
    availableTo?: string;
    maxBookingsPerDay: number;
  };
}
```

## Service Categories
- `haircut` - Hair cutting services
- `beard` - Beard grooming services
- `styling` - Hair styling services
- `coloring` - Hair coloring services
- `treatment` - Hair treatment services
- `other` - Other services

## Workflow

### 1. Admin Creates Base Service
1. Admin creates service with basic information
2. Service is available for barbers to select
3. Admin can manage service lifecycle

### 2. Barber Adds Service
1. Barber selects from available services
2. Sets custom pricing
3. Service is added to barber's portfolio

### 3. Barber Customizes Service
1. Barber updates service details
2. Adds custom description, images
3. Sets pricing tiers and requirements
4. Configures availability

### 4. Service Management
1. Barber can update pricing and details
2. Barber can remove services
3. Admin can deactivate base services
4. Changes affect all barbers using the service

## Features

### Admin Features
- ✅ Create base services
- ✅ Update service information
- ✅ Activate/deactivate services
- ✅ Manage service categories
- ✅ Set service tags
- ✅ Control service availability

### Barber Features
- ✅ Select from available services
- ✅ Set custom pricing
- ✅ Add custom descriptions
- ✅ Upload custom images
- ✅ Create pricing tiers
- ✅ Set service requirements
- ✅ Configure availability
- ✅ Update service details
- ✅ Remove services

## Security
- **Admin endpoints** require admin role
- **Barber endpoints** require barber role
- **JWT authentication** for all endpoints
- **Input validation** for all data
- **ObjectId validation** for service IDs

## Error Handling
- **404** - Service not found
- **400** - Invalid input data
- **401** - Unauthorized
- **403** - Forbidden (wrong role)
- **409** - Service already exists

## Database Schema
- **Service Collection** - Base service information
- **Barber Collection** - Barber's selected services with custom pricing
- **Service customizations** stored in Service collection
- **Barber-specific pricing** stored in Barber collection
