import { OrderService } from '../services/OrderService';
import { initializeDataSource, destroyDataSource } from './test-utils';

const mockRepoInstance = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  create: jest.fn((x) => ({ ...x })),
  save: jest.fn((x) => Promise.resolve({ id: 1, ...x })),
};

describe('Wilaya Tracking Service Integration Tests', () => {
  let service: OrderService;

  beforeAll(async () => {
    await initializeDataSource();
  });

  afterAll(async () => {
    await destroyDataSource();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Set up mock implementations that might have been reset
    mockRepoInstance.find.mockResolvedValue([]);
    mockRepoInstance.findOne.mockResolvedValue(null);
    mockRepoInstance.update.mockResolvedValue({ affected: 1 });
    mockRepoInstance.count.mockResolvedValue(0);
    mockRepoInstance.create.mockImplementation((x) => ({ ...x }));
    mockRepoInstance.save.mockImplementation((x) => Promise.resolve({ id: 1, ...x }));

    service = new OrderService(
      mockRepoInstance as any,
      mockRepoInstance as any,
      mockRepoInstance as any,
      mockRepoInstance as any,
      mockRepoInstance as any,
      mockRepoInstance as any,
      {} as any,
      {} as any
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

      // Verify update and save were called
      expect(mockRepoInstance.update).toHaveBeenCalled();
      expect(mockRepoInstance.save).toHaveBeenCalled();

      // Verify correct object returned
      expect(result).toBeDefined();
      expect(result?.status).toBe('Reçu à Wilaya');
      expect(result?.orderId).toBe(555);
    });
  });
});