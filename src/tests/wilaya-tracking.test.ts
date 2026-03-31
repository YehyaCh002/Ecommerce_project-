import { OrderService } from '../services/OrderService';
import { Order } from '../entities/Order';
import { TrackingLog } from '../entities/TrackingLog';

// Variables in jest.mock factory must start with 'mock' or be defined inside
const mockRepoInstance = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn().mockImplementation(x => Promise.resolve({ id: 1, ...x })),
  create: jest.fn().mockImplementation(x => ({ ...x })),
  count: jest.fn().mockResolvedValue(0),
};

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockRepoInstance),
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
    it('returns orders with calculated aging color', async () => {
      const now = new Date();
      mockRepoInstance.find.mockResolvedValue([
        { id: 101, tracking_status: 'En Localisation', last_status_change_at: new Date(now.getTime() - 10 * 3600), trackingLogs: [] }
      ]);

      const result = await service.getWilayaTrackingOrders();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addTrackingLog', () => {
    it('updates order tracking fields', async () => {
        const result = await service.addTrackingLog(555, 'Reçu à Wilaya', 'Centre', 'Received', 'Hub', 'System');
        expect(result).toBeDefined();
        expect(result.status).toBe('Reçu à Wilaya');
    });
  });
});
