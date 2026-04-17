export const createProductSchema = {
  body: {
    type: 'object',
    required: ['name', 'price', 'stock'],
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      costPrice: { type: 'number', minimum: 0 },
      stock: { type: 'number', minimum: 0 },
      description: { type: 'string' },
      imageUrl: { type: 'string' },
      sku: { type: 'string' },
      categoryId: { type: 'number' },
      subCategoryId: { type: 'number' },
      isLandingPageProduct: { type: 'boolean' },
      deductStockOnConfirmation: { type: 'boolean' },
      variants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            size: { type: 'string' },
            color: { type: 'string' },
            stock: { type: 'number', minimum: 0 },
            priceOverride: { type: 'number', minimum: 0 },
            sku: { type: 'string' },
            imageUrl: { type: 'string' },
          },
        },
      },
    }
  }
};

export const updateProductSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      costPrice: { type: 'number', minimum: 0 },
      stock: { type: 'number', minimum: 0 },
      description: { type: 'string' },
      imageUrl: { type: 'string' },
      sku: { type: 'string' },
      categoryId: { type: 'number' },
      subCategoryId: { type: 'number' },
      isLandingPageProduct: { type: 'boolean' },
      deductStockOnConfirmation: { type: 'boolean' },
    }
  }
};
