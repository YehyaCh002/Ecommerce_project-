import { OrderService } from '../services/OrderService';

// Mock repository كامل
const mockRepoInstance = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  create: jest.fn((x) => ({ ...x })),
  save: jest.fn(async (x) => ({
    id: 1,
    ...x,
  })),
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
    it('updates order tracking fields and returns log', async () => {
      const result = await service.addTrackingLog(
        555,
        'Reçu à Wilaya',
        'Centre',
        'Received',
        'Hub',
        'System'
      );

      // ✅ تأكد أن update و save تم استدعاؤهم
      expect(mockRepoInstance.update).toHaveBeenCalled();
      expect(mockRepoInstance.save).toHaveBeenCalled();

      // ✅ تأكد من النتيجة
      expect(result).toBeDefined();
      expect(result.status).toBe('Reçu à Wilaya');
      expect(result.orderId).toBe(555);
    });
  });
});