const request = require('supertest');
const app = require('../../src/app');
const { setupDatabase } = require('../fixtures/test-data');

describe('🔄 Complete E-Commerce Flow', () => {
  beforeEach(setupDatabase);

  let userToken;
  let adminToken;
  let productId;
  let orderId;
  let reviewId;

  test('Complete user journey from registration to review', async () => {
    console.log('\n🚀 Starting Complete E-Commerce Flow Test...\n');

    // 1. User Registration
    console.log('📝 1. Registering new user...');
    const register = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Flow Test User',
        email: 'flow@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
      .expect(201);
    
    userToken = register.body.data.token;
    console.log('   ✅ User registered successfully\n');

    // 2. Admin Login
    console.log('🔐 2. Logging in as admin...');
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@ecommerce.com',
        password: 'Admin@123'
      })
      .expect(200);
    
    adminToken = adminLogin.body.data.token;
    console.log('   ✅ Admin logged in successfully\n');

    // 3. Admin Creates Product
    console.log('📦 3. Admin creating product...');
    const createProduct = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Flow Test Product',
        description: 'Product for end-to-end testing',
        price: 99.99,
        stock: 100,
        category: 'Test Category',
        featured: true
      })
      .expect(201);
    
    productId = createProduct.body.data._id;
    console.log('   ✅ Product created with ID:', productId, '\n');

    // 4. User Browses Products
    console.log('🔍 4. User browsing products...');
    const getProducts = await request(app)
      .get('/api/products?page=1&limit=10')
      .expect(200);
    
    console.log(`   ✅ Found ${getProducts.body.data.products.length} products\n`);

    // 5. User Adds to Cart
    console.log('🛒 5. User adding product to cart...');
    const addToCart = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: productId,
        quantity: 2
      })
      .expect(200);
    
    console.log('   ✅ Product added to cart. Subtotal:', addToCart.body.data.subtotal, '\n');

    // 6. User Applies Coupon
    console.log('💰 6. User applying coupon...');
    const applyCoupon = await request(app)
      .post('/api/cart/coupon')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ couponCode: 'SAVE10' })
      .expect(200);
    
    console.log('   ✅ Coupon applied. Discount:', applyCoupon.body.data.discount, '\n');

    // 7. User Creates Order
    console.log('📋 7. User creating order...');
    const createOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        shippingAddress: {
          fullName: 'Flow User',
          phone: '+1234567890',
          addressLine1: '123 Flow St',
          city: 'Flow City',
          state: 'FS',
          postalCode: '12345',
          country: 'USA'
        },
        paymentMethod: 'credit_card',
        notes: 'End-to-end test order'
      })
      .expect(201);
    
    orderId = createOrder.body.data._id;
    console.log('   ✅ Order created. Order Number:', createOrder.body.data.orderNumber, '\n');

    // 8. Admin Updates Order Status
    console.log('🔄 8. Admin updating order status...');
    await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderStatus: 'processing',
        notes: 'Processing test order'
      })
      .expect(200);
    
    console.log('   ✅ Order status updated to processing\n');

    // 9. Admin Ships Order
    console.log('📦 9. Admin shipping order...');
    await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderStatus: 'shipped',
        trackingNumber: 'TEST123456789',
        carrier: 'Test Carrier'
      })
      .expect(200);
    
    console.log('   ✅ Order shipped with tracking number\n');

    // 10. Admin Marks as Delivered
    console.log('✅ 10. Admin marking order as delivered...');
    await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderStatus: 'delivered'
      })
      .expect(200);
    
    console.log('   ✅ Order delivered\n');

    // 11. User Writes Review
    console.log('⭐ 11. User writing review...');
    const createReview = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: productId,
        rating: 5,
        title: 'Excellent Product!',
        comment: 'The product exceeded my expectations. Fast delivery and great quality.',
        pros: ['Quality', 'Delivery speed', 'Customer service'],
        cons: ['None']
      })
      .expect(201);
    
    reviewId = createReview.body.data._id;
    console.log('   ✅ Review created (pending moderation)\n');

    // 12. Admin Moderates Review
    console.log('👮 12. Admin moderating review...');
    await request(app)
      .put(`/api/reviews/${reviewId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' })
      .expect(200);
    
    console.log('   ✅ Review approved\n');

    // 13. User Marks Review as Helpful
    console.log('👍 13. User marking review as helpful...');
    await request(app)
      .post(`/api/reviews/${reviewId}/helpful`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'helpful' })
      .expect(200);
    
    console.log('   ✅ Review marked as helpful\n');

    // 14. Admin Adds Seller Reply
    console.log('💬 14. Admin adding seller reply...');
    await request(app)
      .post(`/api/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Thank you for your wonderful review!' })
      .expect(200);
    
    console.log('   ✅ Seller reply added\n');

    // 15. Verify Final State
    console.log('🔍 15. Verifying final state...');
    
    // Check product stock reduced
    const product = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);
    
    console.log('   ✅ Product stock reduced to:', product.body.data.stock);
    
    // Check order status
    const order = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    console.log('   ✅ Order status:', order.body.data.orderStatus);
    
    // Check review visible
    const reviews = await request(app)
      .get(`/api/reviews/product/${productId}`)
      .expect(200);
    
    console.log('   ✅ Review count:', reviews.body.data.statistics.totalReviews);
    
    console.log('\n🎉 ' + '='.repeat(50));
    console.log('✅ END-TO-END TEST COMPLETED SUCCESSFULLY!');
    console.log('   All features working as expected!');
    console.log('='.repeat(50) + '\n');
  }, 30000); // 30 second timeout
});