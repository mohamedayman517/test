// Test setup file for Jest
require('dotenv').config({ path: '.env.test' });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue('OK')
  })
}));

// Mock Bull queue
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    process: jest.fn(),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    }),
    clean: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue()
  }));
});

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_secret_123'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded'
          }
        }
      })
    }
  }));
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

// Mock multer
jest.mock('multer', () => {
  return jest.fn().mockImplementation(() => {
    return {
      single: jest.fn().mockReturnValue((req, res, next) => {
        req.file = {
          fieldname: 'profilePhoto',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          destination: '/tmp',
          filename: 'test-123.jpg',
          path: '/tmp/test-123.jpg',
          size: 1024
        };
        next();
      }),
      array: jest.fn().mockReturnValue((req, res, next) => {
        req.files = [
          {
            fieldname: 'photos',
            originalname: 'test1.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            destination: '/tmp',
            filename: 'test1-123.jpg',
            path: '/tmp/test1-123.jpg',
            size: 1024
          }
        ];
        next();
      })
    };
  });
});

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    size: 1024,
    isFile: () => true
  })
}));

// Mock path
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('/tmp/test-path')
}));

// Global test utilities
global.testUtils = {
  // Create test user data
  createTestUserData: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpassword123',
    phone: '+1234567890',
    role: 'user',
    ...overrides
  }),

  // Create test engineer data
  createTestEngineerData: (overrides = {}) => ({
    name: 'Test Engineer',
    email: 'engineer@example.com',
    password: 'testpassword123',
    phone: '+1234567890',
    role: 'Engineer',
    specialization: 'Interior Design',
    experience: 5,
    isVerified: true,
    isApproved: true,
    ...overrides
  }),

  // Create test booking data
  createTestBookingData: (overrides = {}) => ({
    clientId: 'test-client-id',
    engineerId: 'test-engineer-id',
    packageId: 'test-package-id',
    eventDate: '2024-12-25',
    status: 'pending',
    totalAmount: 1000,
    ...overrides
  }),

  // Mock session
  mockSession: (user = null) => ({
    user,
    destroy: jest.fn().mockImplementation((callback) => {
      if (callback) callback();
    }),
    save: jest.fn().mockImplementation((callback) => {
      if (callback) callback();
    })
  }),

  // Mock request
  mockRequest: (overrides = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    session: global.testUtils.mockSession(),
    ...overrides
  }),

  // Mock response
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.getHeaders = jest.fn().mockReturnValue({});
    return res;
  },

  // Mock next function
  mockNext: jest.fn(),

  // Clean up test data
  cleanupTestData: async () => {
    const mongoose = require('mongoose');
    const collections = Object.keys(mongoose.connection.collections);
    
    for (const collectionName of collections) {
      const collection = mongoose.connection.collections[collectionName];
      await collection.deleteMany({});
    }
  },

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Setup and teardown
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Connect to test database
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test');
});

afterAll(async () => {
  // Disconnect from test database
  const mongoose = require('mongoose');
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clean up test data
  await global.testUtils.cleanupTestData();
});

afterEach(async () => {
  // Additional cleanup if needed
}); 