export const categorySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      slug: { type: 'string' },
      parentCategoryId: { type: 'number' }
    }
  }
};
