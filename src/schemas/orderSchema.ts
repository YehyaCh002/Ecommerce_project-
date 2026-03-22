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
      hasInsurance: { type: 'boolean' },
      customerEmail: { type: 'string', format: 'email' },
      detailedAddress: { type: 'string' },
      deliveryType: { type: 'string', enum: ['Domicile', 'Bureau', 'Yalidine Desk', 'Stop Desk'] },
      soldFromStore: { type: 'boolean' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', minimum: 1 },
            variantId: { type: 'string', format: 'uuid' }
          }
        }
      }
    }
  }
};

export const quickOrderSchema = {
  body: {
    type: 'object',
    required: ['customerInfo', 'items'],
    properties: {
      customerInfo: {
        type: 'object',
        required: ['name', 'phoneNumber'],
        properties: {
          name: { type: 'string' },
          phoneNumber: { type: 'string' },
          email: { type: 'string', format: 'email' },
          address: { type: 'string' }
        }
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', minimum: 1 },
            variantId: { type: 'string', format: 'uuid' }
          }
        }
      },
      paymentMethod: { type: 'string' },
      notes: { type: 'string' },
      remark: { type: 'string' },
      internalComment: { type: 'string' },
      shippingFee: { type: 'number' },
      deliveryType: { type: 'string', enum: ['Domicile', 'Bureau', 'Yalidine Desk', 'Stop Desk'] },
      soldFromStore: { type: 'boolean' }
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
          assignedToId: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          detailedAddress: { type: 'string' },
          deliveryType: { type: 'string', enum: ['Domicile', 'Bureau', 'Yalidine Desk', 'Stop Desk'] },
          soldFromStore: { type: 'boolean' }
        }
      },
      note: { type: 'string' }
    }
  }
};
