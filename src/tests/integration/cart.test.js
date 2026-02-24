const request = require('supertest');
const app = require('../../src/app');
const Cart = require('../../src/models/Cart');
const { setupDatabase, userToken, testProduct } = require('../fixtures/test-data');

describe('🛒 Shopping Cart Module', () => {
  beforeEach(setupDatabase);

  describe('Cart Operations', () => {
    test('Should get empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.subtotal).toBe(0);
    });

    test('Should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].product._id).toBe(testProduct._id.toString());
      expect(response.body.data.subtotal).toBe(testProduct.price * 2);
    });

    test('Should update item quantity', async () => {
      // First add item
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      // Update quantity
      const response = await request(app)
        .put(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 3 })
        .expect(200);

      expect(response.body.data.items[0].quantity).toBe(3);
      expect(response.body.data.subtotal).toBe(testProduct.price * 3);
    });

    test('Should remove item from cart', async () => {
      // First add item
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      // Remove item
      const response = await request(app)
        .delete(`/api/cart/items/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(0);
    });

    test('Should not add more than available stock', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 9999 // More than stock
        })
        .expect(400);

      expect(response.body.message).toContain('Insufficient stock');
    });

    test('Should not add more than max quantity (10)', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 11
        })
        .expect(400);
    });
  });

  describe('Cart Calculations', () => {
    beforeEach(async () => {
      // Add multiple items to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });
    });

    test('Should calculate subtotal correctly', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.subtotal).toBe(testProduct.price * 2);
    });

    test('Should calculate tax correctly', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Tax rate is 10%
      const expectedTax = (testProduct.price * 2) * 0.1;
      expect(response.body.data.tax).toBe(expectedTax);
    });

    test('Should calculate shipping correctly (free over $100)', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Add logic based on subtotal
      if (response.body.data.subtotal >= 100) {
        expect(response.body.data.shippingCost).toBe(0);
      } else {
        expect(response.body.data.shippingCost).toBe(10);
      }
    });

    test('Should calculate total correctly', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const { subtotal, tax, shippingCost, discount } = response.body.data;
      expect(response.body.data.total).toBe(subtotal + tax + shippingCost - discount);
    });
  });

  describe('Coupon System', () => {
    test('Should apply percentage coupon', async () => {
      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      // Apply coupon
      const response = await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ couponCode: 'SAVE10' })
        .expect(200);

      const subtotal = testProduct.price * 2;
      const expectedDiscount = subtotal * 0.1;
      expect(response.body.data.discount).toBe(expectedDiscount);
    });

    test('Should apply fixed amount coupon', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      const response = await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ couponCode: 'FLAT50' })
        .expect(200);

      expect(response.body.data.discount).toBe(50);
    });

    test('Should remove coupon', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      // Apply coupon
      await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ couponCode: 'SAVE10' });

      // Remove coupon
      const response = await request(app)
        .delete('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.couponCode).toBeNull();
      expect(response.body.data.discount).toBe(0);
    });

    test('Should not apply invalid coupon', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ couponCode: 'INVALID' })
        .expect(400);
    });
  });

  describe('Cart Summary & Validation', () => {
    test('Should get cart summary', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      const response = await request(app)
        .get('/api/cart/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.itemCount).toBe(2);
      expect(response.body.data.uniqueItemsCount).toBe(1);
      expect(response.body.data.subtotal).toBeDefined();
    });

    test('Should validate cart before checkout', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      const response = await request(app)
        .get('/api/cart/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
    });
  });

  describe('Clear Cart', () => {
    test('Should clear entire cart', async () => {
      // Add multiple items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      // Clear cart
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.subtotal).toBe(0);
    });
  });
});