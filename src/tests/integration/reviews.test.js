const request = require('supertest');
const app = require('../../src/app');
const Review = require('../../src/models/Review');
const { setupDatabase, userToken, adminToken, testProduct, testUser } = require('../fixtures/test-data');

describe('⭐ Reviews Module', () => {
  beforeEach(setupDatabase);

  const testReview = {
    rating: 5,
    title: 'Great Product!',
    comment: 'This product exceeded my expectations. Highly recommended!',
    pros: ['Quality build', 'Fast delivery'],
    cons: ['None so far']
  };

  describe('Create Reviews', () => {
    test('User should create review', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        })
        .expect(201);

      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.title).toBe(testReview.title);
      expect(response.body.data.status).toBe('pending'); // Needs moderation
    });

    test('Should not create duplicate review', async () => {
      // Create first review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        });

      // Try to create another
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        })
        .expect(400);
    });

    test('Should validate review data', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          rating: 10, // Invalid rating
          title: 'a', // Too short
          comment: 'short' // Too short
        })
        .expect(400);
    });
  });

  describe('Get Reviews', () => {
    let reviewId;

    beforeEach(async () => {
      // Create a review and approve it
      const review = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        });

      reviewId = review.body.data._id;

      // Admin approves the review
      await request(app)
        .put(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });
    });

    test('Should get product reviews', async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}`)
        .expect(200);

      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.statistics.totalReviews).toBe(1);
      expect(response.body.data.statistics.averageRating).toBe(5);
    });

    test('Should get single review', async () => {
      const response = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .expect(200);

      expect(response.body.data._id).toBe(reviewId);
      expect(response.body.data.title).toBe(testReview.title);
    });

    test('Should filter reviews by rating', async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}?rating=5`)
        .expect(200);

      expect(response.body.data.reviews.every(r => r.rating === 5)).toBe(true);
    });

    test('Should sort reviews by helpful', async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}?sort=helpful`)
        .expect(200);

      const helpfulness = response.body.data.reviews.map(r => r.helpful);
      expect(helpfulness).toEqual([...helpfulness].sort((a, b) => b - a));
    });
  });

  describe('Review Interactions', () => {
    let reviewId;

    beforeEach(async () => {
      const review = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        });

      reviewId = review.body.data._id;

      await request(app)
        .put(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });
    });

    test('User should mark review as helpful', async () => {
      const response = await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${adminToken}`) // Different user
        .send({ action: 'helpful' })
        .expect(200);

      expect(response.body.data.helpful).toBe(1);
    });

    test('User should mark review as not helpful', async () => {
      const response = await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'not-helpful' })
        .expect(200);

      expect(response.body.data.notHelpful).toBe(1);
    });

    test('Should not allow duplicate votes', async () => {
      // First vote
      await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'helpful' });

      // Second vote
      await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'helpful' })
        .expect(400);
    });

    test('User should report review', async () => {
      const response = await request(app)
        .post(`/api/reviews/${reviewId}/report`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Inappropriate content' })
        .expect(200);

      expect(response.body.data.reported).toBe(true);
    });
  });

  describe('Update & Delete Reviews', () => {
    let reviewId;

    beforeEach(async () => {
      const review = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        });

      reviewId = review.body.data._id;
    });

    test('User should update their review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 4,
          title: 'Updated Title',
          comment: 'Updated comment',
          pros: ['Updated pro']
        })
        .expect(200);

      expect(response.body.data.rating).toBe(4);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.isEdited).toBe(true);
      expect(response.body.data.editHistory).toHaveLength(1);
    });

    test('User should delete their review', async () => {
      await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const review = await Review.findById(reviewId);
      expect(review).toBeNull();
    });

    test('Should not update another user\'s review', async () => {
      await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('Admin Review Management', () => {
    let reviewId;

    beforeEach(async () => {
      const review = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id,
          ...testReview
        });

      reviewId = review.body.data._id;
    });

    test('Admin should get pending reviews', async () => {
      const response = await request(app)
        .get('/api/reviews/pending/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('Admin should approve review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.moderatedBy).toBeDefined();
    });

    test('Admin should reject review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: 'rejected',
          moderationNote: 'Contains inappropriate content'
        })
        .expect(200);

      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.moderationNote).toBe('Contains inappropriate content');
    });

    test('Admin should add seller reply', async () => {
      // First approve review
      await request(app)
        .put(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      // Add reply
      const response = await request(app)
        .post(`/api/reviews/${reviewId}/reply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: 'Thank you for your feedback!' })
        .expect(200);

      expect(response.body.data.replyFromSeller.comment).toBe('Thank you for your feedback!');
    });

    test('Admin should get review analytics', async () => {
      // Approve the review first
      await request(app)
        .put(`/api/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      const response = await request(app)
        .get('/api/reviews/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.approved).toBeDefined();
      expect(response.body.data.pending).toBeDefined();
    });

    test('Admin should bulk approve reviews', async () => {
      const response = await request(app)
        .post('/api/reviews/bulk-approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reviewIds: [reviewId] })
        .expect(200);

      const review = await Review.findById(reviewId);
      expect(review.status).toBe('approved');
    });
  });
});