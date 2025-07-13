const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { app } = require('../../app');
const User = require('../../models/userSchema');
const Client = require('../../models/clientSchema');

describe('Authentication Tests', () => {
  let testUser;
  let testClient;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test');
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await User.create({
      name: 'Test Engineer',
      email: 'testengineer@test.com',
      password: hashedPassword,
      phone: '+1234567890',
      role: 'Engineer',
      isVerified: true,
      isApproved: true
    });

    // Create test client
    testClient = await Client.create({
      name: 'Test Client',
      email: 'testclient@test.com',
      password: hashedPassword,
      phone: '+0987654321',
      role: 'user'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Client.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear any test data before each test
    await User.deleteMany({ email: { $ne: testUser.email } });
    await Client.deleteMany({ email: { $ne: testClient.email } });
  });

  describe('POST /auth/login', () => {
    it('should login engineer successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'testengineer@test.com',
          password: 'testpassword123',
          role: 'Engineer'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('testengineer@test.com');
      expect(response.body.user.role).toBe('Engineer');
    });

    it('should login client successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'testclient@test.com',
          password: 'testpassword123',
          role: 'user'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('testclient@test.com');
      expect(response.body.user.role).toBe('user');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'testpassword123',
          role: 'Engineer'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'testengineer@test.com',
          password: 'wrongpassword',
          role: 'Engineer'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'testengineer@test.com'
          // Missing password and role
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /auth/register', () => {
    it('should register new engineer successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'New Engineer',
          email: 'newengineer@test.com',
          password: 'newpassword123',
          phone: '+1111111111',
          role: 'Engineer',
          specialization: 'Interior Design',
          experience: 5
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newengineer@test.com');
      expect(response.body.user.role).toBe('Engineer');
      expect(response.body.user.isVerified).toBe(false);
    });

    it('should register new client successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'New Client',
          email: 'newclient@test.com',
          password: 'newpassword123',
          phone: '+2222222222',
          role: 'user'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newclient@test.com');
      expect(response.body.user.role).toBe('user');
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Duplicate Engineer',
          email: 'testengineer@test.com', // Already exists
          password: 'newpassword123',
          phone: '+3333333333',
          role: 'Engineer'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Weak Password User',
          email: 'weakpassword@test.com',
          password: '123', // Too short
          phone: '+4444444444',
          role: 'user'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'testengineer@test.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Reset email sent');
    });

    it('should fail for non-existent email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // First, generate a reset token
      const resetToken = 'valid-reset-token';
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      await User.findOneAndUpdate(
        { email: 'testengineer@test.com' },
        { 
          resetToken,
          resetTokenExpiry
        }
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successful');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });
}); 