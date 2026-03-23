export const cartItemSchema = {
  body: {
    type: 'object',
    required: ['productId', 'quantity'],
    properties: {
      productId: { type: 'number' },
      quantity: { type: 'number', minimum: 1 }
    }
  }
};
