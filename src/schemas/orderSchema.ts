export const createOrderSchema = {
  body: {
    type: 'object',
    required: ['shippingAddress', 'paymentMethod'],
    properties: {
      shippingAddress: { type: 'string', minLength: 1 },
      paymentMethod: { type: 'string', minLength: 1 }
    }
  }
};
