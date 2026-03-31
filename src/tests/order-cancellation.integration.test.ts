import { OrderService } from '../services/OrderService';
import { DeliveryType, Order, OrderStatus, OrderSource, CancellationStatus } from '../entities/Order';
import { OrderHistory, OrderAction } from '../entities/OrderHistory';
import { AppDataSource } from '../config/data-source';
import { initializeDataSource, destroyDataSource } from './test-utils';

const mockOrderRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
};

const mockOrderItemRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockOrderHistoryRepository = {
  create: jest.fn((payload) => payload),
  save: jest.fn(),
  find: jest.fn(),
};

const mockCustomerRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockPlatformRepository = {
  findOne: jest.fn(),
};

const mockProductService = {
  getProductById: jest.fn(),
  updateStock: jest.fn(),
  decreaseStock: jest.fn(),
  decreaseVariantStock: jest.fn(),
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

jest.mock('../services/CartService', () => ({
  CartService: jest.fn().mockImplementation(() => ({
    getCartByUserId: jest.fn(),
    clearCart: jest.fn(),
  })),
}));

jest.mock('../services/ProductService', () => ({
  ProductService: jest.fn().mockImplementation(() => mockProductService),
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
    customerEmail: null as any,
    detailedAddress: null as any,
    totalPrice: 100,
    status: OrderStatus.EN_ATTENTE,
    cancellationStatus: CancellationStatus.NONE,
    cancellationReason: null as any,
    rating: null as any,
    source: OrderSource.WEBSITE,
    trackingNumber: null as any,
    isDelayed: false,
    wilaya: null as any,
    wilayaId: null as any,
    assignedTo: null as any,
    assignedToId: null as any,
    customer: null as any,
    customerId: null as any,
    userId: null as any,
    shippingAddress: null as any,
    paymentMethod: null as any,
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
    tracking_status: null as any,
    current_sub_status: null as any,
    last_status_change_at: null as any,
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

describe('Order Cancellation Integration', () => {
  let orderService: OrderService;

  beforeAll(async () => {
    await initializeDataSource();
  });

  afterAll(async () => {
    await destroyDataSource();
  });

  beforeEach(() => {
    jest.resetAllMocks();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      const name = entity?.name;
      if (name === 'Order') return mockOrderRepository;
      if (name === 'OrderHistory') return mockOrderHistoryRepository;
      if (name === 'OrderItem') return mockOrderItemRepository;
      if (name === 'Customer') return mockCustomerRepository;
      if (name === 'DeliveryPlatform') return mockPlatformRepository;
      return {};
    });

    mockOrderHistoryRepository.create.mockImplementation((payload: any) => payload);
    mockOrderRepository.create.mockImplementation((payload: any) => payload);
    mockOrderItemRepository.create.mockImplementation((payload: any) => payload);
    mockOrderRepository.save.mockImplementation(async (o: any) => o);
    mockOrderHistoryRepository.save.mockResolvedValue({ id: 1 });
    mockProductService.getProductById.mockResolvedValue({ id: 10, stock: 5 });
    mockProductService.updateStock.mockResolvedValue({});

    orderService = new OrderService();
  });

  describe('requestCancellation', () => {
    it('should set cancellationStatus to requested and record the reason', async () => {
      const order = buildOrder({ status: OrderStatus.CONFIRME });
      mockOrderRepository.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order);
      mockOrderHistoryRepository.find.mockResolvedValue([]);
      mockOrderRepository.save.mockImplementationOnce(async (o) => o);

      await orderService.requestCancellation(1, 'No longer needed', 99);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellationStatus: CancellationStatus.REQUESTED,
          cancellationReason: 'No longer needed',
        })
      );

      expect(mockOrderHistoryRepository.save).toHaveBeenCalled();
    });

    it('should throw an error if the order is already shipped', async () => {
      const order = buildOrder({ status: OrderStatus.VERS_LA_WILAYA });
      mockOrderRepository.findOne.mockResolvedValueOnce(order);

      await expect(orderService.requestCancellation(1, 'reason')).rejects.toThrow(
        'Cannot request cancellation for shipped or delivered orders'
      );
    });
  });

  describe('confirmCancellation', () => {
    it('should change status to ANNULE, mark as confirmed, and restore stock', async () => {
      const order = buildOrder({
        status: OrderStatus.CONFIRME,
        cancellationStatus: CancellationStatus.REQUESTED,
        orderItems: [{ productId: 10, quantity: 2 } as any],
      });
      mockOrderRepository.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(order);
      mockOrderHistoryRepository.find.mockResolvedValue([]);
      mockOrderRepository.save.mockImplementationOnce(async (o) => o);

      mockProductService.getProductById.mockResolvedValueOnce({ id: 10, stock: 5 });
      mockProductService.updateStock.mockResolvedValueOnce({});

      await orderService.confirmCancellation(1, 1);

      expect(mockProductService.updateStock).toHaveBeenCalledWith(10, 7);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.ANNULE,
          cancellationStatus: CancellationStatus.CONFIRMED,
        })
      );
    });
  });

  describe('rejectCancellation', () => {
    it('should revert cancellationStatus to NONE and clear the reason', async () => {
      const order = buildOrder({
        status: OrderStatus.CONFIRME,
        cancellationStatus: CancellationStatus.REQUESTED,
        cancellationReason: 'No money',
      });
      mockOrderRepository.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(order);
      mockOrderHistoryRepository.find.mockResolvedValue([]);
      mockOrderRepository.save.mockImplementationOnce(async (o) => o);

      await orderService.rejectCancellation(1, 1);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellationStatus: CancellationStatus.NONE,
          cancellationReason: null,
        })
      );
    });
  });
});
