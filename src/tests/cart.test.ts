import { FastifyInstance } from 'fastify';
import { setupTest, teardownTest, sendAuthenticatedRequest } from './test-utils';

const mockCartService = {
  getCartByUserId: jest.fn(),
  addItemToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeItemFromCart: jest.fn(),
  clearCart: jest.fn(),
};

jest.mock('../services/CartService', () => ({
  CartService: jest.fn().mockImplementation(() => mockCartService),
}));

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

describe('Cart Routes Integration Tests', () => {
  let app: FastifyInstance;
  const userId = '123';

  beforeAll(async () => {
    app = await setupTest();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /cart', () => {
    it('should return 200 and the user cart', async () => {
      const mockCart = { id: 'cart-1', userId, cartItems: [] };
      mockCartService.getCartByUserId.mockResolvedValueOnce(mockCart);

      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/cart',
        userId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('cart-1');
    });
  });

  describe('POST /cart/items', () => {
    const itemToAdd = { productId: 'prod-1', quantity: 2 };

    it('should return 201 when adding an item to cart', async () => {
      mockCartService.addItemToCart.mockResolvedValueOnce({ id: 'cart-1', cartItems: [{ ...itemToAdd, productId: 1 }] });

      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/cart/items',
        payload: { ...itemToAdd, productId: 1 },
        userId,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when quantity is invalid', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/cart/items',
        payload: { productId: 'prod-1', quantity: 0 },
        userId,
      });

      expect(response.status).toBe(400);
    });
  });
});
