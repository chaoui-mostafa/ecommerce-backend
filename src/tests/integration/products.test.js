const request = require('supertest');
const app = require('../../src/app');
const Product = require('../../src/models/Product');
const { setupDatabase, adminToken, userToken, testProduct } = require('../fixtures/test-data');

describe('📦 Products Module', () => {
  beforeEach(setupDatabase);

  describe('Product Creation (Admin Only)', () => {
    test('Admin should create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', 99.99)
        .field('stock', 100)
        .field('category', 'Test Category')
        .field('featured', 'true')
        .attach('images', Buffer.from('fake image'), 'test.jpg')
        .expect(201);

      expect(response.body.data.name).toBe('Test Product');
      expect(response.body.data.price).toBe(99.99);
      expect(response.body.data.images).toHaveLength(1);
    });

    test('Regular user cannot create product', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          stock: 100,
          category: 'Test Category'
        })
        .expect(403);
    });

    test('Should validate product data', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'a', // Too short
          price: -10, // Negative price
          stock: -5 // Negative stock
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Product Retrieval', () => {
    test('Should get all products with pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .expect(200);

      expect(response.body.data.products).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
    });

    test('Should filter products by category', async () => {
      const response = await request(app)
        .get(`/api/products?category=${testProduct.category}`)
        .expect(200);

      expect(response.body.data.products.every(p => p.category === testProduct.category)).toBe(true);
    });

    test('Should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=50&maxPrice=150')
        .expect(200);

      expect(response.body.data.products.every(p => p.price >= 50 && p.price <= 150)).toBe(true);
    });

    test('Should search products by name', async () => {
      const response = await request(app)
        .get('/api/products?search=Test')
        .expect(200);

      expect(response.body.data.products.length).toBeGreaterThan(0);
    });

    test('Should sort products by price', async () => {
      const response = await request(app)
        .get('/api/products?sort=price')
        .expect(200);

      const prices = response.body.data.products.map(p => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    test('Should get single product', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct._id}`)
        .expect(200);

      expect(response.body.data.name).toBe(testProduct.name);
    });
  });

  describe('Product Updates', () => {
    test('Admin should update product', async () => {
      const response = await request(app)
        .put(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          price: 149.99
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.price).toBe(149.99);
    });

    test('Should update stock', async () => {
      const response = await request(app)
        .patch(`/api/products/${testProduct._id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock: 200 })
        .expect(200);

      expect(response.body.data.stock).toBe(200);
    });

    test('Should not update non-existent product', async () => {
      await request(app)
        .put('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('Product Deletion', () => {
    test('Admin should delete product', async () => {
      await request(app)
        .delete(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const product = await Product.findById(testProduct._id);
      expect(product).toBeNull();
    });

    test('Regular user cannot delete product', async () => {
      await request(app)
        .delete(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Product Features', () => {
    test('Should get featured products', async () => {
      const response = await request(app)
        .get('/api/products/featured')
        .expect(200);

      expect(response.body.data.every(p => p.featured === true)).toBe(true);
    });

    test('Should get products by category', async () => {
      const response = await request(app)
        .get(`/api/products/category/${testProduct.category}`)
        .expect(200);

      expect(response.body.data.products.every(p => p.category === testProduct.category)).toBe(true);
    });
  });
});