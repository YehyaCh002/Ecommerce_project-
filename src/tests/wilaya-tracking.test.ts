import { OrderService } from '../services/OrderService';
import { Order, OrderStatus } from '../entities/Order';
import { TrackingLog } from '../entities/TrackingLog';
import { AppDataSource } from '../config/data-source';

// Use a single, reliable mock for all repositories
const mockRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn().mockImplementation(x => Promise.resolve({ id: 1, ...x })),
  create: jest.fn().mockImplementation(x => ({ ...x })),
  count: jest.fn().mockResolvedValue(0),
};

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockRepo),
  },
}));

// Mock other services to avoid constructor errors
jest.mock('../services/CartService', () => ({
  CartService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../services/ProductService', () => ({
  ProductService: jest.fn().mockImplementation(() => ({})),
}));

describe('Wilaya Tracking Service Integration Tests', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  describe('getWilayaTrackingOrders', () => {
    it('returns orders with calculated aging color and attempts count', async () => {
      const now = new Date();
      
      const mockOrders = [
        {
          id: 101,
          tracking_status: 'En Localisation',
          last_status_change_at: new Date(now.getTime() - 10 * 3600000), // 10h ago
          trackingLogs: []
        },
        {
          id: 102,
          tracking_status: 'Tentative Échouée',
          last_status_change_at: new Date(now.getTime() - 30 * 3600000), // 30h ago
          trackingLogs: [{ status: 'Tentative Échouée' }]
        },
        {
          id: 103,
          tracking_status: 'Reçu à Wilaya',
          last_status_change_at: new Date(now.getTime() - 60 * 3600000), // 60h ago
          trackingLogs: [{ status: 'Tentative Échouée' }, { status: 'Tentative Échouée' }]
        }
      ];

      (mockRepo.find as jest.Mock).mockResolvedValue(mockOrders);

      const result = await service.getWilayaTrackingOrders();

      expect(result.length).toBe(3);
      expect(result.find(o => o.id === 101).agingColor).toBe('green');
      expect(result.find(o => o.id === 102).agingColor).toBe('yellow');
      expect(result.find(o => o.id === 102).attemptsCount).toBe(1);
      expect(result.find(o => o.id === 103).agingColor).toBe('red');
      expect(result.find(o => o.id === 103).attemptsCount).toBe(2);
    });
  });

  describe('addTrackingLog', () => {
    it('updates order tracking fields and records the log entry', async () => {
      const orderId = 555;
      const status = 'Reçu à Wilaya';
      
      const result = await service.addTrackingLog(
        orderId,
        status,
        'Centre Algiers',
        'Package received',
        'Algiers Hub',
        'System'
      );

      expect(result).toBeDefined();
      expect(result.orderId).toBe(orderId);
      expect(result.status).toBe(status);
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });
});
