import { AppDataSource } from './src/config/data-source';
import { Product } from './src/entities/Product';
import { ProductVariant } from './src/entities/ProductVariant';
import { Category } from './src/entities/Category';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding...');

    const productRepo = AppDataSource.getRepository(Product);
    const variantRepo = AppDataSource.getRepository(ProductVariant);
    const categoryRepo = AppDataSource.getRepository(Category);

    // 1. Find or create a category
    let category = await categoryRepo.findOne({ where: { name: 'Clothing' } });
    if (!category) {
      category = categoryRepo.create({ name: 'Clothing', description: 'Apparel and more' });
      await categoryRepo.save(category);
    }

    // 2. Create the OverSize T-Shirt Product
    const productName = 'T-Shirt Oversize';
    let product = await productRepo.findOne({ where: { name: productName } });
    
    if (product) {
       // Clear existing variants if any to re-seed
       await variantRepo.delete({ productId: product.id });
    } else {
      product = productRepo.create({
        name: productName,
        description: 'Premium cotton oversize t-shirt',
        price: 2500,
        stock: 34, // Total stock sum
        categoryId: category.id,
        isActive: true,
        sku: 'TSH-OVR-001'
      });
      product = await productRepo.save(product);
    }

    console.log(`Created product: ${product.name} (ID: ${product.id})`);

    // 3. Create Variants (Sizes)
    const variantsData = [
      { size: 'S', color: 'Vert', stock: 8 },
      { size: 'M', color: 'Vert', stock: 9 },
      { size: 'L', color: 'Vert', stock: 9 },
      { size: 'XL', color: 'Vert', stock: 8 },
    ];

    for (const vData of variantsData) {
      const variant = variantRepo.create({
        ...vData,
        productId: product.id
      });
      await variantRepo.save(variant);
      console.log(`  - Added Variant: ${vData.size} (${vData.stock} items)`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
