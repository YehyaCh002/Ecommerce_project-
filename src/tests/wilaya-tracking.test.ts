import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OrderService } from '../services/OrderService';

const mockRepoInstance: Record<string, jest.Mock> = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  create: jest.fn((x: any) => ({ ...x })),
  save: jest.fn((x: any) => Promise.resolve({ id: 1, ...x })),
};

describe('Wilaya Tracking Service Integration Tests', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Set up mock implementations that might have been reset
    mockRepoInstance.find.mockReturnValue(Promise.resolve([]));
    mockRepoInstance.findOne.mockReturnValue(Promise.resolve(null));
    mockRepoInstance.update.mockReturnValue(Promise.resolve({ affected: 1 }));
    mockRepoInstance.count.mockReturnValue(Promise.resolve(0));
    mockRepoInstance.create.mockImplementation((x: any) => ({ ...x }));
    mockRepoInstance.save.mockImplementation((x: any) => Promise.resolve({ id: 1, ...x }));

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

      mockRepoInstance.find.mockReturnValue(Promise.resolve([
        {
          id: 101,
          tracking_status: 'En Localisation',
          last_status_change_at: new Date(now.getTime() - 10 * 3600 * 1000),
          trackingLogs: [],
          updatedAt: now,
          createdAt: now,
        },
      ]));

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