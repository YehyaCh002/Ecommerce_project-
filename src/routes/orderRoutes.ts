import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validateOrder } from '../middlewares/validation';

const router = Router();
const orderController = new OrderController();
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working!' });
});
console.log('🔥 Order routes loaded');
// Customer routes
router.post('/', authenticate, validateOrder, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', authenticate, orderController.cancelOrder);

// Admin routes
router.get('/', authenticate, requireAdmin, orderController.getAllOrders);
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  orderController.updateOrderStatus
);

export default router;
