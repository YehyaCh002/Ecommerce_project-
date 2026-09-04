import { FastifyInstance } from 'fastify';
import { setupTest, teardownTest, sendRequest, sendAdminRequest, sendAuthenticatedRequest } from './test-utils';

// ─── Mock the entire ProductService to avoid TypeORM / DB dependency ──────────
const mockProductService = {
  getAllProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  setProductActiveState: jest.fn(),
  deleteProduct: jest.fn(),
  updateStock: jest.fn(),
  getStockMovements: jest.fn(),
  getStockMovementDetails: jest.fn(),
};

jest.mock('../services/ProductService', () => ({
  ProductService: jest.fn().mockImplementation(() => mockProductService),
}));

// ─── Mock data-source so AppDataSource.getRepository never runs ───────────────
jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
  },
  __esModule: true,
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('Product Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================
  // GET /products
  // ============================
  describe('GET /products', () => {
    it('should return 200 and a list of products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100, stock: 10 },
        { id: '2', name: 'Product 2', price: 200, stock: 20 },
      ];

      mockProductService.getAllProducts.mockResolvedValueOnce({
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const response = await sendRequest(app, {
        method: 'GET',
        url: '/products',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProducts);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(20);
      expect(response.body.meta.totalPages).toBe(1);
    });

    it('should return 200 with an empty array when no products exist', async () => {
      mockProductService.getAllProducts.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const response = await sendRequest(app, {
        method: 'GET',
        url: '/products',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });
  });

  // ============================
  // GET /products/:id
  // ============================
  describe('GET /products/:id', () => {
    it('should return 200 and the product when it exists', async () => {
      const mockProduct = { id: 'abc-123', name: 'Existing Product', price: 99 };
      mockProductService.getProductById.mockResolvedValueOnce(mockProduct);

      const response = await sendRequest(app, {
        method: 'GET',
        url: '/products/abc-123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('abc-123');
    });

    it('should return 404 when the product does not exist', async () => {
      mockProductService.getProductById.mockResolvedValueOnce(null);

      const response = await sendRequest(app, {
        method: 'GET',
        url: '/products/non-existent-id',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  // ============================
  // GET /products/stock-movements (admin-only)
  // ============================
  describe('GET /products/stock-movements', () => {
    it('should return 200 and stock movement rows for admin', async () => {
      mockProductService.getStockMovements.mockResolvedValueOnce([
        {
          id: 1,
          productId: 555,
          productName: 'ZooM Vintage',
          type: 'manual',
          totalChanges: 90,
          oldStock: 89,
          newStock: 179,
        },
      ]);

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/products/stock-movements?types=manual&startDate=2025-06-01&endDate=2025-06-10&categorySearch=Shoes',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(mockProductService.getStockMovements).toHaveBeenCalledWith({
        types: ['manual'],
        startDate: '2025-06-01',
        endDate: '2025-06-10',
        categorySearch: 'Shoes',
      });
    });

    it('should return 403 for non-admin stock movements access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/products/stock-movements',
        userId: '5',
        role: 'customer',
      });

      expect(response.status).toBe(403);
    });
  });

  // ============================
  // GET /products/stock-movements/:id (admin-only)
  // ============================
  describe('GET /products/stock-movements/:id', () => {
    it('should return 200 and movement details for admin', async () => {
      mockProductService.getStockMovementDetails.mockResolvedValueOnce({
        id: 1,
        productId: 555,
        details: {
          colors: {
            BLACK: {
              oldStock: 67,
              newStock: 77,
              sizes: [
                { size: '40', oldStock: 18, newStock: 23 },
              ],
            },
          },
        },
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/products/stock-movements/1',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 when movement is missing', async () => {
      mockProductService.getStockMovementDetails.mockResolvedValueOnce(null);

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/products/stock-movements/9999',
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Stock movement not found');
    });
  });

  // ============================
  // POST /products  (admin-only)
  // ============================
  describe('POST /products', () => {
    const validProduct = {
      name: 'New Product',
      price: 150,
      stock: 50,
      description: 'A great product',
    };

    it('should return 201 when admin sends valid product data', async () => {
      mockProductService.createProduct.mockResolvedValueOnce({ id: '123', ...validProduct });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/products',
        payload: validProduct,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('123');
      expect(response.body.data.name).toBe(validProduct.name);
    });

    it('should accept advanced payload with sub-category, variants and landing page toggle', async () => {
      mockProductService.createProduct.mockResolvedValueOnce({
        id: '124',
        name: 'Sneaker X',
        categoryId: 10,
        subCategoryId: 11,
        isLandingPageProduct: true,
        deductStockOnConfirmation: true,
        expectedMarginPercent: 57.14,
      });

      const payload = {
        name: 'Sneaker X',
        description: 'Lightweight running shoe',
        price: 3500,
        costPrice: 1500,
        stock: 15,
        categoryId: 10,
        subCategoryId: 11,
        isLandingPageProduct: true,
        deductStockOnConfirmation: true,
        variants: [
          {
            size: '42',
            color: 'Black',
            stock: 5,
            imageUrl: 'https://cdn.example.com/black-42.jpg',
          },
          {
            size: '43',
            color: 'Blue',
            stock: 10,
            imageUrl: 'https://cdn.example.com/blue-43.jpg',
          },
        ],
      };

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/products',
        payload,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockProductService.createProduct).toHaveBeenCalledWith(payload);
    });

    it('should return 401 when no auth headers are provided', async () => {
      const response = await sendRequest(app, {
        method: 'POST',
        url: '/products',
        payload: validProduct,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Authentication required/);
    });

    it('should return 400 when user-id header is not a valid integer', async () => {
      const response = await sendRequest(app, {
        method: 'POST',
        url: '/products',
        payload: validProduct,
        headers: {
          'authorization': 'Bearer not-a-valid-token',
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Invalid or expired token/);
    });

    it('should return 403 when a non-admin (customer) user calls the route', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/products',
        payload: validProduct,
        userId: '5',
        role: 'customer',
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Admin access required/);
    });

    it('should return 400 when required fields (price, stock) are missing — JSON Schema', async () => {
      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/products',
        payload: { name: 'Oops' },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 when price is below minimum (0) — JSON Schema', async () => {
      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/products',
        payload: { ...validProduct, price: -10 },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });

    it('should return 400 when stock is below minimum (0) — JSON Schema', async () => {
      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/products',
        payload: { ...validProduct, stock: -5 },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });
  });

  // ============================
  // PATCH /products/:id/status (admin-only)
  // ============================
  describe('PATCH /products/:id/status', () => {
    it('should toggle product status for admin', async () => {
      mockProductService.setProductActiveState.mockResolvedValueOnce({
        id: 55,
        name: 'Toggle Product',
        isActive: false,
      });

      const response = await sendAdminRequest(app, {
        method: 'PATCH',
        url: '/products/55/status',
        payload: { isActive: false },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
      expect(mockProductService.setProductActiveState).toHaveBeenCalledWith(55, false);
    });

    it('should reject non-admin access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'PATCH',
        url: '/products/55/status',
        payload: { isActive: false },
        userId: '5',
        role: 'customer',
      });

      expect(response.status).toBe(403);
    });
  });
});
