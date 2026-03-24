import { test, expect } from '@playwright/test';

test.describe('Order Variants - API Integration Test', () => {

  test('Should reduce stock for a specific variant via API', async ({ request }) => {
    // 1. Get products
    const productsResponse = await request.get('/products');
    expect(productsResponse.status()).toBe(200);
    const productsResult = await productsResponse.json();
    const products = productsResult.data; // API returns { success: true, data: [...] }

    const baseProduct = products.find((p: any) => p.name === 'T-Shirt Oversize');
    expect(baseProduct).toBeDefined();

    // Get detailed product with variants
    const productDetailResponse = await request.get(`/products/${baseProduct.id}`);
    const productResult = await productDetailResponse.json();
    const product = productResult.data;

    const sortedVariants = [...product.variants].sort((a: any, b: any) => b.stock - a.stock);
    const variantWithStock = sortedVariants[0];
    const otherVariant = sortedVariants[1] || sortedVariants[0];

    expect(variantWithStock).toBeDefined();
    expect(variantWithStock.stock).toBeGreaterThan(0);
    const initialStockS = variantWithStock.stock;
    const initialStockM = otherVariant.stock;

    // 2. Create a Quick Order for Variant with stock (1 item)
    const orderResponse = await request.post('/orders/quick-order', {
      data: {
        customerInfo: {
          name: 'Playwright API User',
          phoneNumber: '0999888777'
        },
        items: [
          {
            productId: product.id,
            variantId: variantWithStock.id,
            quantity: 1
          }
        ],
        paymentMethod: 'CASH'
      }
    });

    const bodyRes = await orderResponse.json();
    if (orderResponse.status() !== 201) {
      console.error('Order creation failed:', bodyRes);
    }
    
    expect(orderResponse.status()).toBe(201);

    // 3. Verify Stock Change via API
    const verifyResponse = await request.get(`/products/${product.id}`);
    const updatedResult = await verifyResponse.json();
    const updatedProduct = updatedResult.data;
    const updatedS = updatedProduct.variants.find((v: any) => v.id === variantWithStock.id);
    const updatedM = updatedProduct.variants.find((v: any) => v.id === otherVariant.id);

    expect(updatedS.stock).toBe(initialStockS - 1); // Reduced
    if (variantWithStock.id !== otherVariant.id) {
      expect(updatedM.stock).toBe(initialStockM);     // Unchanged
    }
  });

  test('Should fail if variant stock is insufficient', async ({ request }) => {
    const productsResponse = await request.get('/products');
    const productsResult = await productsResponse.json();
    const products = productsResult.data;

    const baseProduct = products.find((p: any) => p.name === 'T-Shirt Oversize');
    const productDetailResponse = await request.get(`/products/${baseProduct.id}`);
    const productResult = await productDetailResponse.json();
    const product = productResult.data;

    const anyVariant = product.variants[0];

    const failResponse = await request.post('/orders/quick-order', {
      data: {
        customerInfo: {
          name: 'Greedy Buyer',
          phoneNumber: '0666666666'
        },
        items: [
          {
            productId: product.id,
            variantId: anyVariant.id,
            quantity: 1000
          }
        ]
      }
    });

    expect(failResponse.status()).toBe(400);
    const body = await failResponse.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Insufficient stock');
  });
});
