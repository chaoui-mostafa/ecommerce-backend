const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { setupDatabase, userOne, userOneId } = require('../fixtures/test-data');

describe('🔐 Authentication Module', () => {
  beforeEach(setupDatabase);

  describe('User Registration', () => {
    test('Should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      });

      const user = await User.findById(response.body.data.user._id);
      expect(user).not.toBeNull();
      expect(user.password).not.toBe('Password123!'); // password hashed
    });

    test('Should not register with existing email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: userOne.email,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
        .expect(400);
    });

    test('Should validate weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'weakpass@example.com',
          password: 'weak',
          confirmPassword: 'weak'
        })
        .expect(400);

      expect(response.body.message).toContain('Password must be at least 6 characters');
    });
  });

  describe('User Login', () => {
    test('Should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userOne.email,
          password: userOne.password
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userOne.email);
    });

    test('Should not login with wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: userOne.email, password: 'wrongpassword' })
        .expect(401);
    });

    test('Should rate limit login attempts', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: userOne.email, password: 'wrongpassword' });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userOne.email, password: 'wrongpassword' })
        .expect(429);

      expect(response.body.message).toContain('Too many failed login attempts');
    });
  });

  describe('Protected Routes', () => {
    test('Access protected route with valid token', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: userOne.email, password: userOne.password });

      const token = login.body.data.token;

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    test('No token should return 401', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    test('Invalid token should return 401', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('Profile Management', () => {
    let authToken;

    beforeEach(async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: userOne.email, password: userOne.password });
      authToken = login.body.data.token;
    });

    test('Get profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.data.email).toBe(userOne.email);
    });

    test('Update profile', async () => {
      const res = await request(app)
        .put('/api/auth/updatedetails')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name', email: 'updated@example.com' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.email).toBe('updated@example.com');
    });

    test('Update password', async () => {
      await request(app)
        .put('/api/auth/updatepassword')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userOne.password,
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!'
        })
        .expect(200);

      await request(app)
        .post('/api/auth/login')
        .send({ email: userOne.email, password: 'NewPassword123!' })
        .expect(200);
    });
  });
});