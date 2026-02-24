const request = require('supertest');
const app = require('../../src/app');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const { setupDatabase, userToken, adminToken, testProduct, testUser } = require('../fixtures/test-data');

describe('📋 Orders Module', () => {
  beforeEach(setupDatabase);

  const shippingAddress = {
    fullName: 'Test User',
    phone: '+1234567890',
    addressLine1: '123 Test St',
    city: 'Test City',
    state: 'TS',
    postalCode: '12345',
    country: 'USA'
  };

  describe('Order Creation', () => {
    beforeEach(async () => {
      // Add item to cart first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });
    });

    test('Should create order from cart', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress,
          paymentMethod: 'credit_card',
          notes: 'Test order'
        })
        .expect(201);

      expect(response.body.data.orderNumber).toBeDefined();
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.orderStatus).toBe('pending');
      expect(response.body.data.paymentStatus).toBe('pending');
      expect(response.body.data.shippingAddress).toMatchObject(shippingAddress);

      // Check stock reduced
      const product = await Product.findById(testProduct._id);
      expect(product.stock).toBe(testProduct.stock - 2);
    });

    test('Should create order with COD', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress,
          paymentMethod: 'cod'
        })
        .expect(201);

      expect(response.body.data.paymentMethod).toBe('cod');
    });

    test('Should not create order with empty cart', async () => {
      // Clear cart first
      await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress,
          paymentMethod: 'credit_card'
        })
        .expect(400);
    });

    test('Should validate shipping address', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: {
            fullName: 'Test'
            // Missing required fields
          },
          paymentMethod: 'credit_card'
        })
        .expect(400);
    });
  });

  describe('Order Retrieval', () => {
    let orderId;

    beforeEach(async () => {
      // Create an order first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress, paymentMethod: 'credit_card' });

      orderId = order.body.data._id;
    });

    test('Should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('Should get single order by ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data._id).toBe(orderId);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    test('Should get order by order number', async () => {
      const order = await Order.findById(orderId);
      
      const response = await request(app)
        .get(`/api/orders/number/${order.orderNumber}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data._id).toBe(orderId);
    });

    test('Should not get another user\'s order', async () => {
      // Create another user and try to access order
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`) // Different user
        .expect(403);
    });
  });

  describe('Order Cancellation', () => {
    let orderId;

    beforeEach(async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress, paymentMethod: 'credit_card' });

      orderId = order.body.data._id;
    });

    test('Should cancel pending order', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(response.body.data.orderStatus).toBe('cancelled');
      expect(response.body.data.cancellationReason).toBe('Changed my mind');

      // Stock should be restored
      const product = await Product.findById(testProduct._id);
      expect(product.stock).toBe(testProduct.stock);
    });

    test('Should not cancel delivered order', async () => {
      // Update order to delivered
      await Order.findByIdAndUpdate(orderId, { orderStatus: 'delivered' });

      await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(400);
    });
  });

  describe('Admin Order Management', () => {
    let orderId;

    beforeEach(async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          quantity: 2
        });

      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress, paymentMethod: 'credit_card' });

      orderId = order.body.data._id;
    });

    test('Admin should get all orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.orders).toBeDefined();
      expect(response.body.data.statistics).toBeDefined();
    });

    test('Admin should update order status', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderStatus: 'processing',
          notes: 'Processing order'
        })
        .expect(200);

      expect(response.body.data.orderStatus).toBe('processing');
    });

    test('Admin should update order with tracking', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderStatus: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
          estimatedDelivery: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.data.trackingNumber).toBe('1Z999AA10123456784');
      expect(response.body.data.carrier).toBe('UPS');
    });

    test('Admin should update payment status', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentStatus: 'completed',
          transactionId: 'TXN-123456'
        })
        .expect(200);

      expect(response.body.data.paymentStatus).toBe('completed');
      expect(response.body.data.isPaid).toBe(true);
    });

    test('Admin should process refund', async () => {
      // Mark as paid first
      await Order.findByIdAndUpdate(orderId, { 
        paymentStatus: 'completed',
        isPaid: true 
      });

      const response = await request(app)
        .post(`/api/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer returned item',
          amount: 100,
          restoreStock: true
        })
        .expect(200);

      expect(response.body.data.orderStatus).toBe('refunded');
      expect(response.body.data.paymentStatus).toBe('refunded');
    });

    test('Admin should get order statistics', async () => {
      const response = await request(app)
        .get('/api/orders/statistics/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.byStatus).toBeDefined();
      expect(response.body.data.byPaymentMethod).toBeDefined();
    });
  });
});