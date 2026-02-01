import { Request, Response, NextFunction } from 'express';

export const validateProduct = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, price, stock } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Valid product name is required',
    });
    return;
  }

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    res.status(400).json({
      success: false,
      message: 'Price must be a positive number',
    });
    return;
  }

  if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
    res.status(400).json({
      success: false,
      message: 'Stock must be a positive number',
    });
    return;
  }

  next();
};

export const validateCategory = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Valid category name is required',
    });
    return;
  }

  next();
};

export const validateCartItem = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { productId, quantity } = req.body;

  if (!productId || typeof productId !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Valid product ID is required',
    });
    return;
  }

  if (!quantity || typeof quantity !== 'number' || quantity < 1) {
    res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1',
    });
    return;
  }

  next();
};

export const validateOrder = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { shippingAddress, paymentMethod } = req.body;

  if (
    !shippingAddress ||
    typeof shippingAddress !== 'string' ||
    shippingAddress.trim().length === 0
  ) {
    res.status(400).json({
      success: false,
      message: 'Valid shipping address is required',
    });
    return;
  }

  if (
    !paymentMethod ||
    typeof paymentMethod !== 'string' ||
    paymentMethod.trim().length === 0
  ) {
    res.status(400).json({
      success: false,
      message: 'Valid payment method is required',
    });
    return;
  }

  next();
};
