export const createOrderSchema = {
  body: {
    type: 'object',
    required: ['shippingAddress', 'paymentMethod'],
    properties: {
      shippingAddress: { type: 'string', minLength: 1 },
      paymentMethod: { type: 'string', minLength: 1 },
      notes: { type: 'string' },
      remark: { type: 'string' },
      internalComment: { type: 'string' },
      shippingFee: { type: 'number' },
      isExchange: { type: 'boolean' },
      exchangePrice: { type: 'number' },
      productToCollect: { type: 'string' },
      isFreeShipping: { type: 'boolean' },
      hasInsurance: { type: 'boolean' }
    }
  }
};

export const updateOrderSchema = {
  body: {
    type: 'object',
    properties: {
      updateData: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          phoneNumber: { type: 'string' },
          shippingAddress: { type: 'string' },
          paymentMethod: { type: 'string' },
          status: { type: 'string' },
          notes: { type: 'string' },
          remark: { type: 'string' },
          internalComment: { type: 'string' },
          shippingFee: { type: 'number' },
          isExchange: { type: 'boolean' },
          exchangePrice: { type: 'number' },
          productToCollect: { type: 'string' },
          isFreeShipping: { type: 'boolean' },
          hasInsurance: { type: 'boolean' },
          wilayaId: { type: 'number' },
          deliveryPlatformId: { type: 'string' },
          assignedToId: { type: 'string' }
        }
      },
      note: { type: 'string' }
    }
  }
};
