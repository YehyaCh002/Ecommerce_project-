import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validateCategory } from '../middlewares/validation';

const router = Router();
const categoryController = new CategoryController();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateCategory,
  categoryController.createCategory
);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateCategory,
  categoryController.updateCategory
);
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  categoryController.deleteCategory
);

export default router;
