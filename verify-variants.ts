import { AppDataSource } from './src/config/data-source';
import { Product } from './src/entities/Product';
import axios from 'axios';

async function verify() {
  try {
    await AppDataSource.initialize();
    
    // 1. Get Product and Variants
    const productRepo = AppDataSource.getRepository(Product);
    const product = await productRepo.findOne({
      where: { name: 'T-Shirt Oversize' },
      relations: ['variants']
    });

    if (!product || !product.variants) {
      console.error('Product not found! Run seed-variants.ts first.');
      process.exit(1);
    }

    const variantS = product.variants.find(v => v.size === 'S');
    console.log(`Initial Stock for Size S: ${variantS?.stock}`);

    // 2. Send API Request
    console.log('Sending Quick Order request for Size S (2 items)...');
    const response = await axios.post('http://localhost:3000/orders/quick-order', {
      customerInfo: {
        name: 'Verification User',
        phoneNumber: '0123456789'
      },
      items: [
        {
          productId: product.id,
          variantId: variantS?.id,
          quantity: 2
        }
      ],
      paymentMethod: 'CASH'
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Body:', JSON.stringify(response.data, null, 2));

    // 3. Verify Change
    const updatedProduct = await productRepo.findOne({
      where: { id: product.id },
      relations: ['variants']
    });
    const updatedS = updatedProduct?.variants.find(v => v.size === 'S');
    console.log(`Updated Stock for Size S: ${updatedS?.stock}`);

    if (updatedS?.stock === (variantS!.stock - 2)) {
      console.log('✅ SUCCESS: Stock reduced correctly for the specific variant!');
    } else {
      console.error('❌ FAILURE: Stock was not reduced as expected.');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error during verification:', error.response?.data || error.message);
    process.exit(1);
  }
}

verify();
