import { OrderService } from '../services/OrderService';
import { Order, OrderStatus } from '../entities/Order';
import { TrackingLog } from '../entities/TrackingLog';
import { AppDataSource } from '../config/data-source';

const mockOrderRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn(),
};

const mockTrackingLogRepository = {
  create: jest.fn().mockImplementation((p) => ({ ...p })),
  save: jest.fn().mockImplementation((p) => Promise.resolve({ id: 1, ...p, timestamp: new Date() })),
};

const mockOtherRepo = {
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockImplementation(x => Promise.resolve(x)),
  create: jest.fn().mockImplementation(x => x),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
};

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock other services to avoid constructor errors
jest.mock('../services/CartService', () => ({ CartService: jest.fn() }));
jest.mock('../services/ProductService', () => ({ ProductService: jest.fn() }));

describe('Wilaya Tracking Service Logic', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      // Robust matching: check class reference, class name, or entity options name
      const targetName = (typeof entity === 'function' ? entity.name : entity?.options?.name) || '';
      
      if (entity === Order || targetName === 'Order') {
        return mockOrderRepository;
      }
      if (entity === TrackingLog || targetName === 'TrackingLog' || targetName === 'tracking_logs' || targetName.includes('TrackingLog')) {
        return mockTrackingLogRepository;
      }
      
      return mockOtherRepo;
    });

    service = new OrderService();
  });

  describe('getWilayaTrackingOrders', () => {
    it('correctly filters orders and assigns aging labels', async () => {
      const now = new Date();
      
      const mockOrders = [
        {
          id: 1,
          tracking_status: 'En Localisation',
          last_status_change_at: new Date(now.getTime() - 3600000 * 10), // 10 hours ago -> Green
          trackingLogs: []
        },
        {
          id: 2,
          tracking_status: 'Tentative Échouée',
          last_status_change_at: new Date(now.getTime() - 3600000 * 30), // 30 hours ago -> Yellow
          trackingLogs: [{ description: 'First attempt failed', status: 'Tentative Échouée' }]
        },
        {
          id: 3,
          tracking_status: 'Reçu à Wilaya',
          last_status_change_at: new Date(now.getTime() - 3600000 * 60), // 60 hours ago -> Red
          trackingLogs: []
        },
        {
          id: 4,
          tracking_status: 'En Localisation',
          last_status_change_at: new Date(now.getTime() - 3600000 * 5), // 5 hours ago -> Green
          trackingLogs: [{ status: 'Tentative Échouée' }, { status: 'Tentative Échouée' }]
        }
      ];

      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.getWilayaTrackingOrders();

      expect(result.length).toBe(4);
      
      // Order 1: 10h -> Green
      const o1 = result.find(o => o.id === 1);
      expect(o1.agingColor).toBe('green');
      
      // Order 2: 30h -> Yellow
      const o2 = result.find(o => o.id === 2);
      expect(o2.agingColor).toBe('yellow');
      expect(o2.attemptsCount).toBe(1);
      
      // Order 3: 60h -> Red
      const o3 = result.find(o => o.id === 3);
      expect(o3.agingColor).toBe('red');
      
      // Order 4: 2 attempts
      const o4 = result.find(o => o.id === 4);
      expect(o4.attemptsCount).toBe(2);
    });
  });

  describe('addTrackingLog', () => {
    it('updates order tracking fields and saves log', async () => {
        const orderId = 123;
        const status = 'FailedAttempt';
        
        await service.addTrackingLog(orderId, status, 'Client unreachable', 'Call him later', 'Algiers', 'Livreur');
        
        expect(mockOrderRepository.update).toHaveBeenCalled();
        expect(mockTrackingLogRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            orderId,
            actor: 'Livreur',
            description: 'Call him later',
            status: 'FailedAttempt'
        }));
    });
  });
});
