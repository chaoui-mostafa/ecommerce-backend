# 🛍️ E-Commerce Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

**A production-ready, scalable E-Commerce backend API built with Node.js, Express.js, and MongoDB following Clean Architecture and industry best practices.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Deployment](#-deployment) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access & refresh tokens
- Role-based access control (Admin/User)
- Password hashing with bcrypt
- Email verification & password reset
- Rate limiting for auth endpoints

### 📦 Product Management
- Complete CRUD operations
- Advanced filtering, sorting & pagination
- Image upload with Multer & Cloudinary
- Search by name, description, category
- Stock management
- Featured products

### 🏷️ Category Management
- Hierarchical categories (parent-child)
- Category tree structure
- Slug generation for SEO
- Featured categories
- Bulk order update

### 🛒 Shopping Cart
- Add/remove items
- Update quantities
- Auto-calculate totals
- Coupon system
- Cart validation before checkout
- Merge guest cart after login

### 📋 Order Processing
- Create orders from cart
- Automatic order number generation
- Order status workflow
- Payment status tracking
- Shipping address management
- Order history for users
- Admin order management

### ⭐ Reviews & Ratings
- Product reviews with ratings
- Helpful/not helpful voting
- Review moderation system
- Verified purchase badge
- Image attachments
- Seller replies
- Report inappropriate reviews

### 🔒 Security Features
- Helmet.js for security headers
- CORS configuration
- Rate limiting per IP
- XSS protection
- SQL injection prevention
- MongoDB sanitization
- CSRF protection
- Request size limiting
- Session management

### 📊 Additional Features
- Audit logging
- Activity tracking
- Request ID tracking
- API versioning
- Comprehensive error handling
- Input validation
- Data sanitization
- Pagination for all list endpoints

---

## 🛠️ Tech Stack

### Core
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB

### Authentication & Security
- **JWT** - Access tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting
- **xss-clean** - XSS protection
- **express-mongo-sanitize** - NoSQL injection prevention

### File Upload
- **multer** - File upload handling
- **cloudinary** - Cloud storage

### Development & Testing
- **nodemon** - Development server
- **jest** - Testing framework
- **supertest** - API testing

### Deployment
- **docker** - Containerization
- **docker-compose** - Multi-container orchestration
- **nginx** - Reverse proxy
- **pm2** - Process manager

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/chaoui-mostafa/ecommerce-backend.git
   cd ecommerce-backend
   ```

---

## 📚 API Documentation

Interactive API documentation is available via Swagger UI at `/api-docs` endpoint.

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/updatedetails` | Update profile | Private |
| PUT | `/api/auth/updatepassword` | Update password | Private |
| POST | `/api/auth/logout` | Logout user | Private |

### Product Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/products` | Get all products | Public |
| GET | `/api/products/:id` | Get single product | Public |
| POST | `/api/products` | Create product | Admin |
| PUT | `/api/products/:id` | Update product | Admin |
| DELETE | `/api/products/:id` | Delete product | Admin |
| GET | `/api/products/featured` | Get featured products | Public |
| GET | `/api/products/category/:category` | Get by category | Public |

### Category Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/categories` | Get all categories | Public |
| GET | `/api/categories/tree` | Get category tree | Public |
| GET | `/api/categories/:id` | Get single category | Public |
| POST | `/api/categories` | Create category | Admin |
| PUT | `/api/categories/:id` | Update category | Admin |
| DELETE | `/api/categories/:id` | Delete category | Admin |

### Cart Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/cart` | Get user cart | Private |
| POST | `/api/cart/items` | Add to cart | Private |
| PUT | `/api/cart/items/:productId` | Update item | Private |
| DELETE | `/api/cart/items/:productId` | Remove item | Private |
| DELETE | `/api/cart` | Clear cart | Private |
| POST | `/api/cart/coupon` | Apply coupon | Private |

### Order Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/orders` | Create order | Private |
| GET | `/api/orders/my-orders` | Get user orders | Private |
| GET | `/api/orders/:id` | Get order by ID | Private |
| PUT | `/api/orders/:id/cancel` | Cancel order | Private |
| GET | `/api/orders` | Get all orders | Admin |
| PUT | `/api/orders/:id/status` | Update status | Admin |

### Review Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/reviews` | Create review | Private |
| GET | `/api/reviews/product/:productId` | Get product reviews | Public |
| PUT | `/api/reviews/:id` | Update review | Owner |
| DELETE | `/api/reviews/:id` | Delete review | Owner/Admin |
| POST | `/api/reviews/:id/helpful` | Mark helpful | Private |
| POST | `/api/reviews/:id/report` | Report review | Private |