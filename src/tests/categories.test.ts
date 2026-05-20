import { FastifyInstance } from 'fastify';
import { setupTest, teardownTest, sendRequest, sendAdminRequest, sendAuthenticatedRequest } from './test-utils';

const mockCategoryService = {
  getAllCategories: jest.fn(),
  getCategoryById: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
};

jest.mock('../services/CategoryService', () => ({
  CategoryService: jest.fn().mockImplementation(() => mockCategoryService),
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

describe('Category Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /categories', () => {
    it('should return 200 and all categories', async () => {
      const mockCategories = [
        { id: '1', name: 'Electronics' },
        { id: '2', name: 'Books' },
      ];
      mockCategoryService.getAllCategories.mockResolvedValueOnce(mockCategories);

      const response = await sendRequest(app, {
        method: 'GET',
        url: '/categories',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategories);
    });
  });

  describe('POST /categories', () => {
    const validCategory = { name: 'New Category' };

    it('should return 201 for admin created category', async () => {
      mockCategoryService.createCategory.mockResolvedValueOnce({ id: '123', ...validCategory });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/categories',
        payload: validCategory,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validCategory.name);
    });

    it('should return 403 for non-admin', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/categories',
        payload: validCategory,
        userId: '5',
        role: 'customer',
      });

      expect(response.status).toBe(403);
    });
  });
});
