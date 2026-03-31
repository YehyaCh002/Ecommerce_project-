import { OrderService } from '../services/OrderService';
import { DeliveryType, Order, OrderStatus, OrderSource } from '../entities/Order';
import { TrackingLog } from '../entities/TrackingLog';
import { AppDataSource } from '../config/data-source';

const mockOrderRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
};

const mockTrackingLogRepository = {
  create: jest.fn((payload) => payload),
  save: jest.fn((payload) => Promise.resolve({ id: 1, ...payload, timestamp: new Date() })),
};

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock other services to avoid constructor errors
jest.mock('../services/CartService', () => ({
  CartService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../services/ProductService', () => ({
  ProductService: jest.fn().mockImplementation(() => ({})),
}));

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    deliveryType: DeliveryType.DOMICILE,
    soldFromStore: false,
    isValidated: false,
    isPotentialDuplicate: false,
    validationOutcome: null,
    validatedAt: null,
    customerName: 'Client Test',
    phoneNumber: '0550000000',
    customerEmail: 'test@example.com',
    detailedAddress: 'Some Street',
    totalPrice: 100,
    status: OrderStatus.EN_ATTENTE,
    rating: null,
    source: OrderSource.WEBSITE,
    trackingNumber: 'TRK123',
    tracking_status: null,
    current_sub_status: null,
    last_status_change_at: null,
    isDelayed: false,
    wilaya: null as any,
    wilayaId: 16,
    assignedTo: null as any,
    assignedToId: null as any,
    customer: null as any,
    customerId: null as any,
    userId: null as any,
    shippingAddress: 'Address',
    paymentMethod: 'Cash',
    deliveryPlatform: null as any,
    deliveryPlatformId: null as any,
    isExchange: false,
    exchangePrice: 0,
    productToCollect: null as any,
    isFreeShipping: false,
    hasInsurance: false,
    shippingFee: 0,
    remark: null as any,
    internalComment: null as any,
    elapsedMinutes: 0,
    counterColor: 'green',
    calculateTimers: () => {},
    orderItems: [],
    history: [],
    trackingLogs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Order;
}

describe('Wilaya Tracking Service Integration Tests', () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      // Use name-based matching for robustness
      const targetName = (typeof entity === 'function' ? entity.name : entity?.options?.name) || '';
      
      if (targetName === 'Order') return mockOrderRepository;
      if (targetName.includes('TrackingLog') || targetName === 'tracking_logs') return mockTrackingLogRepository;
      
      return { 
          findOne: jest.fn(), 
          save: jest.fn().mockImplementation(x => Promise.resolve(x)), 
          create: jest.fn(x => x), 
          find: jest.fn() 
      };
    });

    service = new OrderService();
  });

  describe('getWilayaTrackingOrders', () => {
    it('returns orders with calculated aging color and attempts count', async () => {
      const now = new Date();
      
      const mockOrders = [
        buildOrder({
          id: 101,
          tracking_status: 'En Localisation',
          last_status_change_at: new Date(now.getTime() - 1000 * 60 * 60 * 10), // 10h ago
          trackingLogs: []
        }),
        buildOrder({
          id: 102,
          tracking_status: 'Tentative Échouée',
          last_status_change_at: new Date(now.getTime() - 1000 * 60 * 60 * 30), // 30h ago
          trackingLogs: [
            { status: 'Tentative Échouée', description: 'Client busy' } as any
          ]
        }),
        buildOrder({
          id: 103,
          tracking_status: 'Reçu à Wilaya',
          last_status_change_at: new Date(now.getTime() - 1000 * 60 * 60 * 60), // 60h ago
          trackingLogs: [
            { status: 'Tentative Échouée' } as any,
            { status: 'Tentative Échouée' } as any
          ]
        })
      ];

      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.getWilayaTrackingOrders();

      expect(result.length).toBe(3);
      
      // Order 101: Green
      const o101 = result.find(o => o.id === 101);
      expect(o101.agingColor).toBe('green');
      expect(o101.attemptsCount).toBe(0);

      // Order 102: Yellow
      const o102 = result.find(o => o.id === 102);
      expect(o102.agingColor).toBe('yellow');
      expect(o102.attemptsCount).toBe(1);

      // Order 103: Red
      const o103 = result.find(o => o.id === 103);
      expect(o103.agingColor).toBe('red');
      expect(o103.attemptsCount).toBe(2);
    });
  });

  describe('addTrackingLog', () => {
    it('updates order tracking fields and records the log entry', async () => {
      const orderId = 555;
      mockOrderRepository.update.mockResolvedValue({ affected: 1 });
      
      const status = 'Reçu à Wilaya';
      const subStatus = 'Centre Algiers';
      const description = 'Package received at central hub';
      
      const result = await service.addTrackingLog(
        orderId,
        status,
        subStatus,
        description,
        'Algiers Hub',
        'System'
      );

      expect(result).toBeDefined();
      expect(result.orderId).toBe(orderId);
      expect(result.status).toBe(status);
      
      expect(mockOrderRepository.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          tracking_status: status,
          current_sub_status: subStatus,
          last_status_change_at: expect.any(Date)
        })
      );

      expect(mockTrackingLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          status,
          sub_status: subStatus,
          description,
          actor: 'System'
        })
      );
    });
  });
});
