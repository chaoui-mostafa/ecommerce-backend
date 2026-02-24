// Switch to ecommerce database
db = db.getSiblingDB('ecommerce');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        email: {
          bsonType: 'string',
          pattern: '^.+@.+\\..+$',
          description: 'must be a valid email and is required'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ category: 1, price: 1 });
db.orders.createIndex({ user: 1, createdAt: -1 });
db.reviews.createIndex({ product: 1, createdAt: -1 });

// Create initial admin user (password will be changed on first run)
db.users.insertOne({
  name: 'Admin User',
  email: 'admin@ecommerce.com',
  password: '$2a$10$Zm9hZmZmZmZmZmZmZmZmOq8zZzXVqVqVqVqVqVqVqVqVqVq', // "ChangeMe123!"
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');