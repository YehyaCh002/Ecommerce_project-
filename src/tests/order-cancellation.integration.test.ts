import { OrderService } from '../services/OrderService';
import { DeliveryType, Order, OrderStatus, OrderSource, ValidationOutcome, CancellationStatus } from '../entities/Order';
import { OrderHistory, OrderAction } from '../entities/OrderHistory';
import { AppDataSource } from '../config/data-source';

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

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../services/CartService', () => ({
  CartService: jest.fn().mockImplementation(() => ({
    getCartByUserId: jest.fn(),
    clearCart: jest.fn(),
  })),
}));

const mockProductService = {
  getProductById: jest.fn(),
  updateStock: jest.fn(),
  decreaseStock: jest.fn(),
  decreaseVariantStock: jest.fn(),
};

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

  beforeAll(() => {
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity.name === 'Order') return mockOrderRepository;
      if (entity.name === 'OrderHistory') return mockOrderHistoryRepository;
      if (entity.name === 'OrderItem') return mockOrderItemRepository;
      if (entity.name === 'Customer') return mockCustomerRepository;
      if (entity.name === 'DeliveryPlatform') return mockPlatformRepository;
      return {};
    });

    orderService = new OrderService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderHistoryRepository.create.mockImplementation((payload: any) => payload);
    mockOrderRepository.create.mockImplementation((payload: any) => payload);
    mockOrderItemRepository.create.mockImplementation((payload: any) => payload);
  });

  describe('requestCancellation', () => {
    it('should set cancellationStatus to requested and record the reason', async () => {
      const order = buildOrder({ status: OrderStatus.CONFIRME });
      mockOrderRepository.findOne
        .mockResolvedValueOnce(order) // First call for initial getOrderById
        .mockResolvedValueOnce(order); // Second call inside logOrderAction -> getOrderById
      mockOrderHistoryRepository.find.mockResolvedValue([]);
      mockOrderRepository.save.mockImplementationOnce(async (o) => o);

      const result = await orderService.requestCancellation(1, 'No longer needed', 99);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellationStatus: CancellationStatus.REQUESTED,
          cancellationReason: 'No longer needed',
        })
      );

      // Verify history is logged
      expect(mockOrderHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: OrderAction.STATUS_UPDATED,
          details: 'Cancellation requested: No longer needed',
        })
      );
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
        orderItems: [
          { productId: 10, quantity: 2 } as any,
        ],
      });
      mockOrderRepository.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order);
      mockOrderHistoryRepository.find.mockResolvedValue([]);
      mockOrderRepository.save.mockImplementationOnce(async (o) => o);

      mockProductService.getProductById.mockResolvedValueOnce({ id: 10, stock: 5 });
      mockProductService.updateStock.mockResolvedValueOnce({});

      const result = await orderService.confirmCancellation(1, 1); // User 1 is admin

      expect(mockProductService.getProductById).toHaveBeenCalledWith(10);
      expect(mockProductService.updateStock).toHaveBeenCalledWith(10, 7); // 5 + 2

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.ANNULE,
          cancellationStatus: CancellationStatus.CONFIRMED,
        })
      );

      expect(mockOrderHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: OrderAction.CANCELLED,
          details: 'Cancellation request confirmed',
        })
      );
    });

    it('should throw an error if order is not in REQUESTED cancellation state', async () => {
      const order = buildOrder({
        status: OrderStatus.CONFIRME,
        cancellationStatus: CancellationStatus.NONE,
      });
      mockOrderRepository.findOne.mockResolvedValueOnce(order);

      await expect(orderService.confirmCancellation(1)).rejects.toThrow(
        'Order is not in requested cancellation state'
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
      mockOrderRepository.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order);
      mockOrderHistoryRepository.find.mockResolvedValue([]);
      mockOrderRepository.save.mockImplementationOnce(async (o) => o);

      const result = await orderService.rejectCancellation(1, 1);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellationStatus: CancellationStatus.NONE,
          cancellationReason: null,
        })
      );

      expect(mockOrderHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: OrderAction.STATUS_UPDATED,
          details: 'Cancellation request rejected',
        })
      );
    });
  });
});
