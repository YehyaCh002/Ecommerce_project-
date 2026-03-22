import { test, expect } from '@playwright/test';

test.describe('Order Variants - API Integration Test', () => {

  test('Should reduce stock for specific variant (S) via API', async ({ request }) => {
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

    const variantS = product.variants.find((v: any) => v.size === 'S');
    const variantM = product.variants.find((v: any) => v.size === 'M');

    expect(variantS).toBeDefined();
    const initialStockS = variantS.stock;
    const initialStockM = variantM.stock;

    // 2. Create a Quick Order for Variant S (1 item)
    const orderResponse = await request.post('/orders/quick-order', {
      data: {
        customerInfo: {
          name: 'Playwright API User',
          phoneNumber: '0999888777'
        },
        items: [
          {
            productId: product.id,
            variantId: variantS.id,
            quantity: 1
          }
        ],
        paymentMethod: 'CASH'
      }
    });

    expect(orderResponse.status()).toBe(201);

    // 3. Verify Stock Change via API
    const verifyResponse = await request.get(`/products/${product.id}`);
    const updatedResult = await verifyResponse.json();
    const updatedProduct = updatedResult.data;
    const updatedS = updatedProduct.variants.find((v: any) => v.size === 'S');
    const updatedM = updatedProduct.variants.find((v: any) => v.size === 'M');

    expect(updatedS.stock).toBe(initialStockS - 1); // Reduced
    expect(updatedM.stock).toBe(initialStockM);     // Unchanged
  });

  test('Should fail if variant stock is insufficient', async ({ request }) => {
    const productsResponse = await request.get('/products');
    const productsResult = await productsResponse.json();
    const products = productsResult.data;

    const baseProduct = products.find((p: any) => p.name === 'T-Shirt Oversize');
    const productDetailResponse = await request.get(`/products/${baseProduct.id}`);
    const productResult = await productDetailResponse.json();
    const product = productResult.data;

    const variantXL = product.variants.find((v: any) => v.size === 'XL');

    const failResponse = await request.post('/orders/quick-order', {
      data: {
        customerInfo: {
          name: 'Greedy Buyer',
          phoneNumber: '0666666666'
        },
        items: [
          {
            productId: product.id,
            variantId: variantXL.id,
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
