import { FastifyRequest, FastifyReply } from 'fastify';

export const validateProduct = async (
  req: FastifyRequest,
  res: FastifyReply
): Promise<void> => {
  const { name, price, stock } = req.body as any;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).send({
      success: false,
      message: 'Valid product name is required',
    });
    return;
  }

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    res.status(400).send({
      success: false,
      message: 'Price must be a positive number',
    });
    return;
  }

  if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
    res.status(400).send({
      success: false,
      message: 'Stock must be a positive number',
    });
    return;
  }
};

export const validateCategory = async (
  req: FastifyRequest,
  res: FastifyReply
): Promise<void> => {
  const { name } = req.body as any;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).send({
      success: false,
      message: 'Valid category name is required',
    });
    return;
  }
};

export const validateCartItem = async (
  req: FastifyRequest,
  res: FastifyReply
): Promise<void> => {
  const { productId, quantity } = req.body as any;

  if (!productId || typeof productId !== 'string') {
    res.status(400).send({
      success: false,
      message: 'Valid product ID is required',
    });
    return;
  }

  if (!quantity || typeof quantity !== 'number' || quantity < 1) {
    res.status(400).send({
      success: false,
      message: 'Quantity must be at least 1',
    });
    return;
  }
};

export const validateOrder = async (
  req: FastifyRequest,
  res: FastifyReply
): Promise<void> => {
  const { shippingAddress, paymentMethod } = req.body as any;

  if (
    !shippingAddress ||
    typeof shippingAddress !== 'string' ||
    shippingAddress.trim().length === 0
  ) {
    res.status(400).send({
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
    res.status(400).send({
      success: false,
      message: 'Valid payment method is required',
    });
    return;
  }
};
