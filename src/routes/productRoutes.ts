import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validateProduct } from '../middlewares/validation';

const router = Router();
const productController = new ProductController();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateProduct,
  productController.createProduct
);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateProduct,
  productController.updateProduct
);
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  productController.deleteProduct
);
router.patch(
  '/:id/stock',
  authenticate,
  requireAdmin,
  productController.updateStock
);

export default router;
