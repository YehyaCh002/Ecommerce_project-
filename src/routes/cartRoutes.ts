import { Router } from 'express';
import { CartController } from '../controllers/CartController';
import { authenticate } from '../middlewares/auth';
import { validateCartItem } from '../middlewares/validation';

const router = Router();
const cartController = new CartController();

// All cart routes require authentication
router.get('/', authenticate, cartController.getCart);
router.get('/total', authenticate, cartController.getCartTotal);
router.post(
  '/items',
  authenticate,
  validateCartItem,
  cartController.addItemToCart
);
router.put('/items/:itemId', authenticate, cartController.updateCartItem);
router.delete('/items/:itemId', authenticate, cartController.removeItemFromCart);
router.delete('/', authenticate, cartController.clearCart);

export default router;
