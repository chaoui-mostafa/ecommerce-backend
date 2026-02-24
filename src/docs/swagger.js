const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API Documentation',
      version: '1.0.0',
      description: 'Complete E-Commerce Backend API with Node.js, Express, and MongoDB',
      contact: {
        name: 'API Support',
        email: 'support@ecommerce.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.ecommerce.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            stock: { type: 'number' },
            category: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            ratings: { type: 'number' },
            numOfReviews: { type: 'number' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            slug: { type: 'string' },
            parentCategory: { type: 'string' }
          }
        },
        Cart: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  quantity: { type: 'number' },
                  price: { type: 'number' },
                  totalPrice: { type: 'number' }
                }
              }
            },
            subtotal: { type: 'number' },
            total: { type: 'number' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            orderNumber: { type: 'string' },
            items: { type: 'array' },
            total: { type: 'number' },
            orderStatus: { type: 'string' },
            paymentStatus: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            rating: { type: 'number' },
            title: { type: 'string' },
            comment: { type: 'string' },
            user: { type: 'string' },
            product: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array' },
            requestId: { type: 'string' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Products', description: 'Product management endpoints' },
      { name: 'Categories', description: 'Category management endpoints' },
      { name: 'Cart', description: 'Shopping cart endpoints' },
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'Reviews', description: 'Product review endpoints' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Health', description: 'Health check endpoints' }
    ]
  },
  apis: ['./src/routes/*.js', './src/docs/*.yaml']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;