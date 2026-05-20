import { FastifyInstance } from 'fastify';
import { setupTest, teardownTest, sendAdminRequest, sendRequest, sendAuthenticatedRequest } from './test-utils';

const mockPlatformService = {
  getAllPlatforms: jest.fn(),
  createPlatform: jest.fn(),
  updatePlatform: jest.fn(),
};

const mockOrderService = {
  createGuestOrder: jest.fn(),
  getOrderById: jest.fn(),
};

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

jest.mock('../services/DeliveryPlatformService', () => ({
  DeliveryPlatformService: jest.fn().mockImplementation(() => mockPlatformService),
}));

jest.mock('../services/OrderService', () => ({
  OrderService: jest.fn().mockImplementation(() => ({
    ...mockOrderService,
  })),
}));

describe('Delivery Platforms & Order Timers Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Delivery Platform Management', () => {
    it('should create a new delivery platform via admin', async () => {
      const payload = {
        name: 'Yalidine',
        apiKey: 'yali_123',
        apiSecret: 'secret_abc'
      };
      
      mockPlatformService.createPlatform.mockResolvedValueOnce({ id: 'uuid-1', ...payload });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/delivery-platforms',
        payload
      });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Yalidine');
    });

    it('should return 403 when a non-admin tries to create a platform', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/delivery-platforms',
        payload: { name: 'Test' },
        userId: '2',
        role: 'customer'
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Order Quick-Order & Timers', () => {
    it('should return elapsedMinutes and counterColor in response', async () => {
      const orderData = {
        id: 123,
        customerName: 'Test Customer',
        createdAt: new Date(),
        elapsedMinutes: 0,
        counterColor: 'green'
      };

      mockOrderService.createGuestOrder.mockResolvedValueOnce(orderData);

      const response = await sendRequest(app, {
        method: 'POST',
        url: '/orders/quick-order',
        payload: {
          customerInfo: { name: 'Test', phoneNumber: '0555000111' },
          items: [{ productId: 1, quantity: 2 }],
          paymentMethod: 'Cash'
        }
      });

      expect(response.status).toBe(201);
      expect(response.body.data.elapsedMinutes).toBeDefined();
      expect(response.body.data.counterColor).toBe('green');
    });
  });
});
