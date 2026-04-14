import { OrderService } from '../services/OrderService';
import { DeliveryType, Order, OrderStatus, OrderSource, ValidationOutcome } from '../entities/Order';
import { OrderHistory } from '../entities/OrderHistory';
import { AppDataSource } from '../config/data-source';
import { initializeDataSource, destroyDataSource } from './test-utils';

const mockOrderRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
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
  ProductService: jest.fn().mockImplementation(() => ({
    getProductById: jest.fn(),
    updateStock: jest.fn(),
    decreaseStock: jest.fn(),
    decreaseVariantStock: jest.fn(),
  })),
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

describe('Order validation integration behavior', () => {
  let service: OrderService;

  beforeAll(async () => {
    await initializeDataSource();
  });

  afterAll(async () => {
    await destroyDataSource();
  });

  beforeEach(() => {
    jest.resetAllMocks();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = entity?.name;
      if (name === 'Order') return mockOrderRepository;
      if (name === 'OrderHistory') return mockOrderHistoryRepository;
      if (name === 'OrderItem') return mockOrderItemRepository;
      if (name === 'Customer') return mockCustomerRepository;
      if (name === 'DeliveryPlatform') return mockPlatformRepository;
      return {};
    });

    mockOrderHistoryRepository.save.mockResolvedValue({ id: 1 });
    mockOrderRepository.update.mockResolvedValue({ affected: 1 });
    mockOrderRepository.save.mockImplementation(async (order: any) => order);

    service = new OrderService(
      mockOrderRepository,
      mockOrderItemRepository,
      mockOrderHistoryRepository,
      mockCustomerRepository,
      mockPlatformRepository,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('sets validated=true and outcome=received when status becomes LIVRE', async () => {
    const baseOrder = buildOrder({ status: OrderStatus.CONFIRME });
    const updatedOrder = buildOrder({
      status: OrderStatus.LIVRE,
      isValidated: true,
      validationOutcome: ValidationOutcome.RECEIVED,
      validatedAt: new Date(),
    });

    mockOrderRepository.findOne
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(updatedOrder);
    mockOrderHistoryRepository.find.mockResolvedValue([]);
    mockOrderHistoryRepository.save.mockResolvedValue({ id: 1 });

    const result = await service.updateOrderStatus(1, OrderStatus.LIVRE, 1);

    expect(result?.status).toBe(OrderStatus.LIVRE);
    expect(result?.isValidated).toBe(true);
    expect(result?.validationOutcome).toBe(ValidationOutcome.RECEIVED);
    expect(mockOrderRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: OrderStatus.LIVRE,
        isValidated: true,
        validationOutcome: ValidationOutcome.RECEIVED,
      })
    );
  });

  it('forces isValidated=false when outcome is returned', async () => {
    const baseOrder = buildOrder({ isValidated: true, validationOutcome: ValidationOutcome.RECEIVED });
    const savedOrder = buildOrder({
      isValidated: false,
      validationOutcome: ValidationOutcome.RETURNED,
      validatedAt: null,
    });

    mockOrderRepository.findOne
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(savedOrder);
    mockOrderHistoryRepository.find.mockResolvedValue([]);
    mockOrderRepository.save.mockImplementation(async (order) => order);

    const result = await service.updateOrder(1, {
      isValidated: true,
      validationOutcome: ValidationOutcome.RETURNED,
    });

    expect(result?.isValidated).toBe(false);
    expect(result?.validationOutcome).toBe(ValidationOutcome.RETURNED);
    expect(result?.validatedAt).toBeNull();
  });

  it('rejects exchange when order is not delivered', async () => {
    const baseOrder = buildOrder({
      status: OrderStatus.CONFIRME,
      validatedAt: null,
      isValidated: false,
    });

    mockOrderRepository.findOne.mockResolvedValueOnce(baseOrder);

    await expect(
      service.updateOrder(1, {
        isExchange: true,
      })
    ).rejects.toThrow('Exchange is only allowed for delivered orders');
  });

  it('rejects exchange when delivered order is older than 3 days', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const baseOrder = buildOrder({
      status: OrderStatus.LIVRE,
      isValidated: true,
      validationOutcome: ValidationOutcome.RECEIVED,
      validatedAt: fourDaysAgo,
    });

    mockOrderRepository.findOne.mockResolvedValueOnce(baseOrder);

    await expect(
      service.updateOrder(1, {
        isExchange: true,
      })
    ).rejects.toThrow('Exchange window expired');
  });

  it('allows exchange when delivered within 3 days', async () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const baseOrder = buildOrder({
      status: OrderStatus.LIVRE,
      isValidated: true,
      validationOutcome: ValidationOutcome.RECEIVED,
      validatedAt: oneDayAgo,
      isExchange: false,
    });
    const updatedOrder = buildOrder({
      status: OrderStatus.LIVRE,
      isValidated: true,
      validationOutcome: ValidationOutcome.RECEIVED,
      validatedAt: oneDayAgo,
      isExchange: true,
    });

    mockOrderRepository.findOne
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(updatedOrder);
    mockOrderHistoryRepository.find.mockResolvedValue([]);
    mockOrderRepository.save.mockImplementation(async (order) => order);

    const result = await service.updateOrder(1, {
      isExchange: true,
    });

    expect(result?.isExchange).toBe(true);
    expect(mockOrderRepository.save).toHaveBeenCalled();
  });
});
