import { FastifyInstance } from 'fastify';
import { setupTest, teardownTest, sendAuthenticatedRequest, sendAdminRequest, sendRequest } from './test-utils';

const mockOrderService = {
  createOrderFromCart: jest.fn(),
  createGuestOrder: jest.fn(),
  getOrderById: jest.fn(),
  getOrdersByUserId: jest.fn(),
  getAllOrders: jest.fn(),
  getReclamationOrders: jest.fn(),
  getCommandesStatistics: jest.fn(),
  getRetoursStatistics: jest.fn(),
  getEchecsStatistics: jest.fn(),
  getVenteStockStatistics: jest.fn(),
  createVendorReturnBatch: jest.fn(),
  getVendorReturnBatchSummary: jest.fn(),
  scanVendorReturnParcel: jest.fn(),
  closeVendorReturnBatch: jest.fn(),
  updateOrderStatus: jest.fn(),
  updateOrder: jest.fn(),
  cancelOrder: jest.fn(),
  requestExchange: jest.fn(),
  approveExchange: jest.fn(),
  rejectExchange: jest.fn(),
};

jest.mock('../services/OrderService', () => ({
  OrderService: jest.fn().mockImplementation(() => mockOrderService),
}));

jest.mock('../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
  },
  __esModule: true,
}));

describe('Order Routes Integration Tests', () => {
  let app: FastifyInstance;
  const userId = '99';

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

  describe('POST /orders/quick-order', () => {
    it('should forward deliveryType and soldFromStore from customerInfo to service', async () => {
      mockOrderService.createGuestOrder.mockResolvedValueOnce({
        id: 10,
        customerName: 'Quick Buyer',
        deliveryType: 'Bureau',
        soldFromStore: true,
      });

      const response = await sendRequest(app, {
        method: 'POST',
        url: '/orders/quick-order',
        payload: {
          customerInfo: {
            name: 'Quick Buyer',
            phoneNumber: '0555000111',
            deliveryType: 'Bureau',
            soldFromStore: true,
          },
          items: [
            {
              productId: 1,
              quantity: 1,
            },
          ],
          paymentMethod: 'Cash',
        },
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockOrderService.createGuestOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Quick Buyer',
          phoneNumber: '0555000111',
          deliveryType: 'Bureau',
          soldFromStore: true,
        }),
        expect.any(Array),
        'Cash',
        undefined,
        undefined,
        undefined,
        'Bureau',
        true
      );
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

    it('should return reclamation orders and summary for admin', async () => {
      mockOrderService.getReclamationOrders.mockResolvedValueOnce({
        orders: [{ id: 77, reclamationTags: ['cancellation'] }],
        summary: {
          total: 1,
          cancellation: 1,
          exchange: 0,
          failedDelivery: 0,
          duplicate: 0,
        },
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders/reclamations?type=cancellation&search=77',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.summary.cancellation).toBe(1);
      expect(mockOrderService.getReclamationOrders).toHaveBeenCalledWith({
        type: 'cancellation',
        search: '77',
        platformId: undefined,
        wilayaId: undefined,
        status: undefined,
      });
    });

    it('should return 403 for non-admin reclamations access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/orders/reclamations',
        userId,
      });

      expect(response.status).toBe(403);
    });

    it('should return commandes statistics for admin and forward query', async () => {
      mockOrderService.getCommandesStatistics.mockResolvedValueOnce({
        tab: 'undefined',
        summary: { total: 3, label: 'lost_parcels' },
        orders: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders/stats/commandes?tab=undefined&startDate=2025-06-01&endDate=2025-06-10&assignedToId=1&status=Confirm%C3%A9&search=055',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tab).toBe('undefined');
      expect(mockOrderService.getCommandesStatistics).toHaveBeenCalledWith({
        tab: 'undefined',
        startDate: '2025-06-01',
        endDate: '2025-06-10',
        assignedToId: 1,
        status: 'Confirmé',
        search: '055',
      });
    });

    it('should return 403 for non-admin commandes statistics access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/orders/stats/commandes?tab=on_alert',
        userId,
      });

      expect(response.status).toBe(403);
    });

    it('should return retours statistics for admin and forward query', async () => {
      mockOrderService.getRetoursStatistics.mockResolvedValueOnce({
        summary: {
          totalReturnedOrders: 2,
          deliveredCount: 10,
          returnRateFromDelivered: 20,
          returnedRevenue: 5600,
          averageReturnValue: 2800,
        },
        breakdown: {
          byWilaya: [{ name: 'Alger', count: 2 }],
          byPlatform: [{ name: 'Yalidine', count: 2 }],
        },
        orders: [{ id: 1 }, { id: 2 }],
        count: 2,
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders/stats/retours?startDate=2025-06-05&endDate=2025-06-10&assignedToId=1&platformId=2&wilayaId=16&search=055',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalReturnedOrders).toBe(2);
      expect(mockOrderService.getRetoursStatistics).toHaveBeenCalledWith({
        startDate: '2025-06-05',
        endDate: '2025-06-10',
        assignedToId: 1,
        platformId: 2,
        wilayaId: 16,
        search: '055',
      });
    });

    it('should return 403 for non-admin retours statistics access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/orders/stats/retours',
        userId,
      });

      expect(response.status).toBe(403);
    });

    it('should return echecs statistics for admin and forward query', async () => {
      mockOrderService.getEchecsStatistics.mockResolvedValueOnce({
        summary: { total: 10 },
        charts: {
          bar: [{ key: 'localization', label: 'En localisation', count: 6 }],
          pie: [{ key: 'localization', label: 'En localisation', count: 6 }],
        },
        cards: [
          {
            key: 'localization',
            label: 'En localisation',
            count: 6,
            attribution: [{ label: 'Erreur de traitement', count: 4 }],
          },
        ],
        orders: [{ id: 1 }],
        count: 1,
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders/stats/echecs?startDate=2025-06-05&endDate=2025-06-10&assignedToId=1&platformId=2&wilayaId=16&search=055',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(10);
      expect(mockOrderService.getEchecsStatistics).toHaveBeenCalledWith({
        startDate: '2025-06-05',
        endDate: '2025-06-10',
        assignedToId: 1,
        platformId: 2,
        wilayaId: 16,
        search: '055',
      });
    });

    it('should return 403 for non-admin echecs statistics access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/orders/stats/echecs',
        userId,
      });

      expect(response.status).toBe(403);
    });

    it('should return vente stock statistics for admin and forward query', async () => {
      mockOrderService.getVenteStockStatistics.mockResolvedValueOnce({
        summary: {
          productsCount: 1,
          totalItemsSold: 3,
          totalBoxesSold: 2,
          totalRevenue: 1990,
        },
        rows: [
          {
            productId: 555,
            productName: 'Shark',
            quantitySold: 3,
            boxesSold: 2,
            purchasePrice: 700,
            salesRevenue: 1990,
          },
        ],
        count: 1,
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders/stats/vente-stock?statuses=Livr%C3%A9,Confirm%C3%A9&startDate=2025-06-10&endDate=2025-06-10&categorySearch=Shoes&productSearch=Shark',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalItemsSold).toBe(3);
      expect(mockOrderService.getVenteStockStatistics).toHaveBeenCalledWith({
        statuses: ['Livré', 'Confirmé'],
        startDate: '2025-06-10',
        endDate: '2025-06-10',
        categorySearch: 'Shoes',
        productSearch: 'Shark',
      });
    });

    it('should return 403 for non-admin vente stock statistics access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'GET',
        url: '/orders/stats/vente-stock',
        userId,
      });

      expect(response.status).toBe(403);
    });

    it('should create a vendor return batch for admin', async () => {
      mockOrderService.createVendorReturnBatch.mockResolvedValueOnce({
        batch: { id: 9, dischargeReference: 'BATCH-2025-06-12' },
        summary: { declaredCount: 2, scannedCount: 0, missingCount: 2 },
      });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/orders/vendor-returns/batches',
        payload: {
          dischargeReference: 'BATCH-2025-06-12',
          trackingNumbers: ['TRK1', 'TRK2'],
          deliveryPlatformId: 3,
          notes: 'Retour du jour',
        },
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.batch.id).toBe(9);
      expect(mockOrderService.createVendorReturnBatch).toHaveBeenCalledWith({
        dischargeReference: 'BATCH-2025-06-12',
        trackingNumbers: ['TRK1', 'TRK2'],
        deliveryPlatformId: 3,
        notes: 'Retour du jour',
        createdByUserId: 1,
      });
    });

    it('should return vendor return batch summary for admin', async () => {
      mockOrderService.getVendorReturnBatchSummary.mockResolvedValueOnce({
        batch: { id: 9, status: 'open' },
        summary: { declaredCount: 2, scannedCount: 1, missingCount: 1 },
      });

      const response = await sendAdminRequest(app, {
        method: 'GET',
        url: '/orders/vendor-returns/batches/9',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.batch.status).toBe('open');
      expect(mockOrderService.getVendorReturnBatchSummary).toHaveBeenCalledWith(9);
    });

    it('should scan vendor return parcel for admin', async () => {
      mockOrderService.scanVendorReturnParcel.mockResolvedValueOnce({
        batch: { id: 9 },
        summary: { declaredCount: 2, scannedCount: 2, missingCount: 0 },
      });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/orders/vendor-returns/batches/9/scan',
        payload: {
          trackingNumber: 'TRK2',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.scannedCount).toBe(2);
      expect(mockOrderService.scanVendorReturnParcel).toHaveBeenCalledWith({
        batchId: 9,
        trackingNumber: 'TRK2',
        scannedByUserId: 1,
      });
    });

    it('should close vendor return batch for admin', async () => {
      mockOrderService.closeVendorReturnBatch.mockResolvedValueOnce({
        batch: { id: 9, status: 'closed' },
        summary: { declaredCount: 2, scannedCount: 2, missingCount: 0 },
      });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/orders/vendor-returns/batches/9/close',
        payload: {
          note: 'All parcels verified',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.batch.status).toBe('closed');
      expect(mockOrderService.closeVendorReturnBatch).toHaveBeenCalledWith({
        batchId: 9,
        closedByUserId: 1,
        note: 'All parcels verified',
      });
    });

    it('should return 403 for non-admin vendor return access', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/orders/vendor-returns/batches',
        userId,
        payload: {
          dischargeReference: 'X',
          trackingNumbers: ['TRK1'],
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /orders/:id', () => {
    it('should return 200 and updated order for admin', async () => {
      const updatedOrder = { id: 1, isExchange: true, shippingFee: 500 };
      mockOrderService.updateOrder.mockResolvedValueOnce(updatedOrder);

      const response = await sendAdminRequest(app, {
        method: 'PUT',
        url: '/orders/1/update',
        payload: {
          updateData: { isExchange: true, shippingFee: 500 },
          note: 'Admin made this an exchange'
        }
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isExchange).toBe(true);
      expect(mockOrderService.updateOrder).toHaveBeenCalledWith(1, { isExchange: true, shippingFee: 500 }, 1, 'Admin made this an exchange');
    });

    it('should return 403 if not admin', async () => {
      const response = await sendAuthenticatedRequest(app, {
        method: 'PUT',
        url: '/orders/1/update',
        payload: {
          updateData: { isExchange: true }
        },
        userId,
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 if order not found', async () => {
      mockOrderService.updateOrder.mockResolvedValueOnce(null);

      const response = await sendAdminRequest(app, {
        method: 'PUT',
        url: '/orders/999/update',
        payload: {
          updateData: { isExchange: true }
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Exchange workflow routes', () => {
    it('should allow authenticated user to request exchange', async () => {
      mockOrderService.requestExchange.mockResolvedValueOnce({ id: 15 });

      const response = await sendAuthenticatedRequest(app, {
        method: 'POST',
        url: '/orders/15/exchange/request',
        userId,
        payload: { reason: 'Need another size' },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockOrderService.requestExchange).toHaveBeenCalledWith(
        15,
        Number(userId),
        'Need another size'
      );
    });

    it('should allow admin to approve exchange', async () => {
      mockOrderService.approveExchange.mockResolvedValueOnce({ id: 22, isExchange: true });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/orders/22/exchange/approve',
        payload: { note: 'Approved' },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockOrderService.approveExchange).toHaveBeenCalledWith(22, 1, 'Approved');
    });

    it('should allow admin to reject exchange', async () => {
      mockOrderService.rejectExchange.mockResolvedValueOnce({ id: 23, isExchange: false });

      const response = await sendAdminRequest(app, {
        method: 'POST',
        url: '/orders/23/exchange/reject',
        payload: { note: 'Window passed' },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockOrderService.rejectExchange).toHaveBeenCalledWith(23, 1, 'Window passed');
    });
  });
});
