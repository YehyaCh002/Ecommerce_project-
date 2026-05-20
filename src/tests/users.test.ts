import { FastifyInstance } from 'fastify';
import { setupTest, teardownTest, sendRequest, sendAdminRequest, sendAuthenticatedRequest } from './test-utils';

const mockUserService = {
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

jest.mock('../services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => mockUserService),
}));

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
  },
  __esModule: true,
  default: {
    getRepository: jest.fn(),
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
  }
}));

describe('User Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('should return 200 and a list of users for admin', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@example.com', role: 'customer' },
        { id: '2', name: 'User 2', email: 'user2@example.com', role: 'admin' },
      ];
      mockUserService.getAllUsers.mockResolvedValueOnce(mockUsers);

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/users',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/users',
        userId: '5',
        role: 'customer',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /users', () => {
    const newUser = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
    };

    it('should return 201 when creating a valid user', async () => {
      mockUserService.createUser.mockResolvedValueOnce({ id: '123', ...newUser, role: 'customer' });

      const response = await sendRequest(app, {
        method: 'POST',
        url: '/users',
        payload: newUser,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('123');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await sendRequest(app, {
        method: 'POST',
        url: '/users',
        payload: { name: 'Incomplete' },
      });

      expect(response.status).toBe(400);
    });
  });
});
