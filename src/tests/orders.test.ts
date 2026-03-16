import { FastifyInstance } from 'fastify';
import { setupTest, sendAuthenticatedRequest, sendAdminRequest } from './test-utils';

const mockOrderService = {
  createOrderFromCart: jest.fn(),
  getOrderById: jest.fn(),
  getOrdersByUserId: jest.fn(),
  getAllOrders: jest.fn(),
  updateOrderStatus: jest.fn(),
  cancelOrder: jest.fn(),
};

jest.mock('../services/OrderService', () => ({
  OrderService: jest.fn().mockImplementation(() => mockOrderService),
}));

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true,
  },
}));

describe('Order Routes Integration Tests', () => {
  let app: FastifyInstance;
  const userId = '00000000-0000-0000-0000-000000000099';

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    const validOrder = {
      shippingAddress: '123 Main St',
      paymentMethod: 'Credit Card',
    };

    it('should return 201 when creating an order from cart', async () => {
      mockOrderService.createOrderFromCart.mockResolvedValueOnce({ id: 1, ...validOrder, userId });

      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/orders',
        payload: validOrder,
        userId,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 400 when shipping address is missing', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/orders',
        payload: { paymentMethod: 'Card' },
        userId,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /orders', () => {
    it('should return 200 and all orders for admin', async () => {
      mockOrderService.getAllOrders.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it('should return user orders for customer when calling /orders/my-orders', async () => {
       mockOrderService.getOrdersByUserId.mockResolvedValueOnce([{ id: 1 }]);

       const response = await sendAuthenticatedRequest(app, {
         method: 'GET',
         url: '/orders/my-orders',
         userId,
       });

       expect(response.status).toBe(200);
       expect(response.body.data[0].id).toBe(1);
    });
  });
});
