export const createProductSchema = {
  body: {
    type: 'object',
    required: ['name', 'price', 'stock'],
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      stock: { type: 'number', minimum: 0 },
      description: { type: 'string' },
      categoryId: { type: 'number' }
    }
  }
};

export const updateProductSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      stock: { type: 'number', minimum: 0 },
      description: { type: 'string' },
      categoryId: { type: 'number' }
    }
  }
};
