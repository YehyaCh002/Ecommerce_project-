import { FastifyInstance } from 'fastify';
import { setupTest, sendAdminRequest } from './test-utils';
import { OrderAction } from '../entities/OrderHistory';
import { OrderStatus } from '../entities/Order';

const mockOrderService = {
  getOrderById: jest.fn(),
  logOrderAction: jest.fn(),
  getOrderHistory: jest.fn(),
};

jest.mock('../services/OrderService', () => ({
  OrderService: jest.fn().mockImplementation(() => mockOrderService),
}));

describe('Order History Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Order History Timeline', () => {
    it('should allow admin to log a specific action from the Enum', async () => {
      const orderId = 123;
      const actionPayload = {
        action: OrderAction.PRINTED,
        details: 'Order receipt printed',
      };

      mockOrderService.logOrderAction.mockResolvedValueOnce({
        id: 1,
        orderId,
        action: OrderAction.PRINTED,
        status: OrderStatus.CONFIRME,
        details: 'Order receipt printed',
        timestamp: new Date(),
      });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: `/orders/${orderId}/history`,
        payload: actionPayload,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.action).toBe(OrderAction.PRINTED);
    });

    it('should return a list of history entries with Enum values', async () => {
      const orderId = 123;
      const historyData = [
        {
          id: 1,
          action: OrderAction.CREATED,
          status: OrderStatus.EN_ATTENTE,
          timestamp: new Date(),
        },
        {
          id: 2,
          action: OrderAction.PRINTED,
          status: OrderStatus.CONFIRME,
          timestamp: new Date(),
        },
      ];

      mockOrderService.getOrderHistory.mockResolvedValueOnce(historyData);

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: `/orders/${orderId}/history`,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[1].action).toBe(OrderAction.PRINTED);
    });
  });
});
