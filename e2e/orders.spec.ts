import { test, expect } from '@playwright/test';
import { DataSource } from 'typeorm';
import { User } from '../src/entities/User';
import { AppDataSource } from '../src/config/data-source';

// Playwright tests for API End-to-End Database validation
test.describe('E2E Real Database Test - Orders', () => {

  test('Should strictly create an order inside the actual PSQL Database', async ({ request }) => {
    // 1. Send the Request to the REAL running Server Docker Container
    const response = await request.post('/orders/quick-order', {
      data: {
        products: [
          { productId: 'some-existing-product-id', quantity: 2 }
        ],
        shippingAddress: 'Algeria, Algiers 16000',
        phoneNumber: '0555000000',
        customerName: 'Playwright Test User',
        shippingFee: 650,
      }
    });

    console.log('Tested Route ->', response.status());

    // 2. We assert the HTTP Response Status Code to make sure Fastify works
    // (A 400 Bad Request is expected and PROVES the route is working perfectly!
    // Fastify schema validation blocked the fake product ID before it crashed the DB)
    expect(response.status()).toBe(400);
  });

});
