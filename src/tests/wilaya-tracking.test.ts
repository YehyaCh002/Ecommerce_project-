import { OrderService } from '../services/OrderService';

// Mock repository واحد نستخدموه لكل شيء
const mockRepoInstance = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn().mockImplementation((x) => Promise.resolve({ id: 1, ...x })),
  create: jest.fn().mockImplementation((x) => ({ ...x })),
  count: jest.fn().mockResolvedValue(0),
};

describe('Wilaya Tracking Service Integration Tests', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new OrderService(
      mockRepoInstance as any, // orderRepository
      mockRepoInstance as any, // orderItemRepository
      mockRepoInstance as any, // orderHistoryRepository
      mockRepoInstance as any, // customerRepository
      mockRepoInstance as any, // platformRepository
      mockRepoInstance as any, // trackingLogRepository
      {} as any, // cartService
      {} as any  // productService
    );
  });

  describe('getWilayaTrackingOrders', () => {
    it('returns orders with calculated aging color', async () => {
      const now = new Date();

      mockRepoInstance.find.mockResolvedValue([
        {
          id: 101,
          tracking_status: 'En Localisation',
          last_status_change_at: new Date(now.getTime() - 10 * 3600 * 1000),
          trackingLogs: [],
          updatedAt: now,
          createdAt: now,
        },
      ]);

      const result = await service.getWilayaTrackingOrders();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('agingColor');
    });
  });

  describe('addTrackingLog', () => {
    it('updates order tracking fields', async () => {
      const result = await service.addTrackingLog(
        555,
        'Reçu à Wilaya',
        'Centre',
        'Received',
        'Hub',
        'System'
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('Reçu à Wilaya');

      expect(mockRepoInstance.update).toHaveBeenCalled();
      expect(mockRepoInstance.save).toHaveBeenCalled();
    });
  });
});