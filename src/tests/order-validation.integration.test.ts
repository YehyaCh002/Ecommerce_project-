import { OrderService } from '../services/OrderService';
import { DeliveryType, Order, OrderStatus, OrderSource, ValidationOutcome } from '../entities/Order';
import { OrderHistory } from '../entities/OrderHistory';
import { AppDataSource } from '../config/data-source';

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
  },
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
    elapsedMinutes: 0,
    counterColor: 'green',
    orderItems: [],
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Order;
}

describe('Order validation integration behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === Order) return mockOrderRepository;
      if (entity === OrderHistory) return mockOrderHistoryRepository;
      if (entity?.name === 'OrderItem') return mockOrderItemRepository;
      if (entity?.name === 'Customer') return mockCustomerRepository;
      if (entity?.name === 'DeliveryPlatform') return mockPlatformRepository;
      return {};
    });
  });

  it('sets validated=true and outcome=received when status becomes LIVRE', async () => {
    const service = new OrderService();
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

    const result = await service.updateOrderStatus(1, OrderStatus.LIVRE, 'admin-id');

    expect(result?.status).toBe(OrderStatus.LIVRE);
    expect(result?.isValidated).toBe(true);
    expect(result?.validationOutcome).toBe(ValidationOutcome.RECEIVED);
    expect(mockOrderRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: OrderStatus.LIVRE,
        isValidated: true,
        validationOutcome: ValidationOutcome.RECEIVED,
        validatedAt: expect.any(Date),
      })
    );
  });

  it('forces isValidated=false when outcome is returned', async () => {
    const service = new OrderService();
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
    expect(mockOrderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isValidated: false,
        validationOutcome: ValidationOutcome.RETURNED,
        validatedAt: null,
      })
    );
  });

  it('auto marks exchange flag when outcome is exchanged', async () => {
    const service = new OrderService();
    const baseOrder = buildOrder({ isExchange: false });
    const savedOrder = buildOrder({
      isExchange: true,
      isValidated: false,
      validationOutcome: ValidationOutcome.EXCHANGED,
      validatedAt: null,
    });

    mockOrderRepository.findOne
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce(savedOrder);
    mockOrderHistoryRepository.find.mockResolvedValue([]);
    mockOrderRepository.save.mockImplementation(async (order) => order);

    const result = await service.updateOrder(1, {
      validationOutcome: ValidationOutcome.EXCHANGED,
    });

    expect(result?.validationOutcome).toBe(ValidationOutcome.EXCHANGED);
    expect(result?.isExchange).toBe(true);
    expect(result?.isValidated).toBe(false);
  });
});
