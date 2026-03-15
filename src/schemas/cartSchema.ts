export const cartItemSchema = {
  body: {
    type: 'object',
    required: ['productId', 'quantity'],
    properties: {
      productId: { type: 'string' },
      quantity: { type: 'number', minimum: 1 }
    }
  }
};
