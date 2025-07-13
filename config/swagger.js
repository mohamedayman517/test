const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Decor And More API',
      version: '1.0.0',
      description: 'A comprehensive API for the Decor And More platform',
      contact: {
        name: 'API Support',
        email: 'support@decoreandmore.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User unique identifier'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['user', 'Engineer', 'Admin'],
              description: 'User role in the system'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether the user is verified'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          }
        },
        Engineer: {
          type: 'object',
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              properties: {
                specialization: {
                  type: 'string',
                  description: 'Engineer specialization'
                },
                experience: {
                  type: 'number',
                  description: 'Years of experience'
                },
                rating: {
                  type: 'number',
                  description: 'Average rating'
                },
                isApproved: {
                  type: 'boolean',
                  description: 'Whether the engineer is approved'
                }
              }
            }
          ]
        },
        Booking: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Booking unique identifier'
            },
            clientId: {
              type: 'string',
              description: 'Client user ID'
            },
            engineerId: {
              type: 'string',
              description: 'Engineer user ID'
            },
            packageId: {
              type: 'string',
              description: 'Package ID'
            },
            eventDate: {
              type: 'string',
              format: 'date',
              description: 'Event date'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'completed', 'cancelled'],
              description: 'Booking status'
            },
            totalAmount: {
              type: 'number',
              description: 'Total booking amount'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Booking creation timestamp'
            }
          }
        },
        Package: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Package unique identifier'
            },
            name: {
              type: 'string',
              description: 'Package name'
            },
            description: {
              type: 'string',
              description: 'Package description'
            },
            price: {
              type: 'number',
              description: 'Package price'
            },
            duration: {
              type: 'number',
              description: 'Package duration in hours'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the package is active'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    security: [
      {
        sessionAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './middleware/*.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Decor And More API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true
  }
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
}; 