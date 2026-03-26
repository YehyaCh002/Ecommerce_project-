import { AppDataSource } from '../config/data-source';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { Wilaya } from '../entities/Wilaya';
import { DeliveryPlatform } from '../entities/DeliveryPlatform';
import { User } from '../entities/User';

type CategorySeed = {
  name: string;
  description?: string;
  slug?: string;
};

type ProductSeed = {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  sku: string;
  categoryName: string;
};

type VariantSeed = {
  productSku: string;
  size: string;
  color: string;
  stock: number;
  priceOverride?: number;
  sku: string;
};

type WilayaSeed = {
  name: string;
  code: string;
  shippingFee: number;
};

type PlatformSeed = {
  name: string;
  isActive: boolean;
};

type UserSeed = {
  name: string;
  email: string;
  password: string;
  role: string;
};

const categoriesSeed: CategorySeed[] = [
  {
    name: 'Clothing',
    description: 'Daily wear and trendy outfits',
    slug: 'clothing',
  },
  {
    name: 'Footwear',
    description: 'Sneakers, shoes and sandals',
    slug: 'footwear',
  },
  {
    name: 'Accessories',
    description: 'Bags, caps and essentials',
    slug: 'accessories',
  },
];

const productsSeed: ProductSeed[] = [
  {
    name: 'T-Shirt Oversize',
    description: 'Premium cotton oversize t-shirt',
    price: 2500,
    sku: 'TSH-OVR-001',
    categoryName: 'Clothing',
  },
  {
    name: 'Urban Hoodie',
    description: 'Warm fleece hoodie for winter',
    price: 4900,
    sku: 'HOD-URB-001',
    categoryName: 'Clothing',
  },
  {
    name: 'Street Cap',
    description: 'Adjustable cap with curved visor',
    price: 1800,
    sku: 'CAP-STR-001',
    categoryName: 'Accessories',
  },
];

const variantsSeed: VariantSeed[] = [
  {
    productSku: 'TSH-OVR-001',
    size: 'S',
    color: 'Vert',
    stock: 8,
    sku: 'TSH-OVR-001-S-VERT',
  },
  {
    productSku: 'TSH-OVR-001',
    size: 'M',
    color: 'Vert',
    stock: 9,
    sku: 'TSH-OVR-001-M-VERT',
  },
  {
    productSku: 'TSH-OVR-001',
    size: 'L',
    color: 'Vert',
    stock: 9,
    sku: 'TSH-OVR-001-L-VERT',
  },
  {
    productSku: 'TSH-OVR-001',
    size: 'XL',
    color: 'Vert',
    stock: 8,
    sku: 'TSH-OVR-001-XL-VERT',
  },
  {
    productSku: 'HOD-URB-001',
    size: 'M',
    color: 'Black',
    stock: 6,
    sku: 'HOD-URB-001-M-BLK',
  },
  {
    productSku: 'HOD-URB-001',
    size: 'L',
    color: 'Black',
    stock: 5,
    sku: 'HOD-URB-001-L-BLK',
  },
  {
    productSku: 'HOD-URB-001',
    size: 'XL',
    color: 'Black',
    stock: 4,
    sku: 'HOD-URB-001-XL-BLK',
  },
];

const wilayasSeed: WilayaSeed[] = [
  { name: 'Alger', code: '16', shippingFee: 450 },
  { name: 'Oran', code: '31', shippingFee: 550 },
  { name: 'Constantine', code: '25', shippingFee: 550 },
  { name: 'Annaba', code: '23', shippingFee: 600 },
  { name: 'Blida', code: '09', shippingFee: 500 },
];

const platformsSeed: PlatformSeed[] = [
  { name: 'Yalidine', isActive: true },
  { name: 'ZR Express', isActive: true },
  { name: 'No Platform', isActive: true },
];

const usersSeed: UserSeed[] = [
  {
    name: 'Admin User',
    email: 'admin@shop.local',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Sales Associate',
    email: 'associate@shop.local',
    password: 'associate123',
    role: 'associate',
  },
];

async function seedCategories(): Promise<Map<string, Category>> {
  const categoryRepo = AppDataSource.getRepository(Category);
  const categoryMap = new Map<string, Category>();

  for (const seed of categoriesSeed) {
    let category = await categoryRepo.findOne({ where: { name: seed.name } });
    if (!category) {
      category = categoryRepo.create(seed);
    } else {
      category.description = seed.description || category.description;
      category.slug = seed.slug || category.slug;
    }

    const saved = await categoryRepo.save(category);
    categoryMap.set(saved.name, saved);
  }

  return categoryMap;
}

async function seedProducts(categoryMap: Map<string, Category>): Promise<Map<string, Product>> {
  const productRepo = AppDataSource.getRepository(Product);
  const productMap = new Map<string, Product>();

  for (const seed of productsSeed) {
    const category = categoryMap.get(seed.categoryName);
    if (!category) {
      throw new Error(`Category not found for product ${seed.sku}`);
    }

    let product = await productRepo.findOne({ where: { sku: seed.sku } });
    if (!product) {
      product = productRepo.create({
        ...seed,
        categoryId: category.id,
        isActive: true,
        stock: 0,
      });
    } else {
      product.name = seed.name;
      product.description = seed.description;
      product.price = seed.price;
      product.imageUrl = seed.imageUrl || product.imageUrl;
      product.categoryId = category.id;
      product.isActive = true;
    }

    const saved = await productRepo.save(product);
    productMap.set(saved.sku, saved);
  }

  return productMap;
}

async function seedVariants(productMap: Map<string, Product>): Promise<void> {
  const variantRepo = AppDataSource.getRepository(ProductVariant);
  const productRepo = AppDataSource.getRepository(Product);

  for (const seed of variantsSeed) {
    const product = productMap.get(seed.productSku);
    if (!product) {
      throw new Error(`Product not found for variant ${seed.sku}`);
    }

    let variant = await variantRepo.findOne({
      where: {
        productId: product.id,
        size: seed.size,
        color: seed.color,
      },
    });

    if (!variant) {
      variant = variantRepo.create({
        productId: product.id,
        size: seed.size,
        color: seed.color,
        stock: seed.stock,
        priceOverride: seed.priceOverride,
        sku: seed.sku,
      });
    } else {
      variant.stock = seed.stock;
      variant.priceOverride = seed.priceOverride || variant.priceOverride;
      variant.sku = seed.sku;
    }

    await variantRepo.save(variant);
  }

  for (const product of productMap.values()) {
    const variants = await variantRepo.find({ where: { productId: product.id } });
    const totalStock = variants.reduce((acc, variant) => acc + Number(variant.stock), 0);
    product.stock = totalStock;
    await productRepo.save(product);
  }
}

async function seedWilayas(): Promise<void> {
  const wilayaRepo = AppDataSource.getRepository(Wilaya);

  for (const seed of wilayasSeed) {
    let wilaya = await wilayaRepo.findOne({ where: { code: seed.code } });
    if (!wilaya) {
      wilaya = wilayaRepo.create(seed);
    } else {
      wilaya.name = seed.name;
      wilaya.shippingFee = seed.shippingFee;
    }

    await wilayaRepo.save(wilaya);
  }
}

async function seedDeliveryPlatforms(): Promise<void> {
  const platformRepo = AppDataSource.getRepository(DeliveryPlatform);

  for (const seed of platformsSeed) {
    let platform = await platformRepo.findOne({ where: { name: seed.name } });
    if (!platform) {
      platform = platformRepo.create(seed);
    } else {
      platform.isActive = seed.isActive;
    }

    await platformRepo.save(platform);
  }
}

async function seedUsers(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);

  for (const seed of usersSeed) {
    let user = await userRepo.findOne({ where: { email: seed.email } });
    if (!user) {
      user = userRepo.create(seed);
    } else {
      user.name = seed.name;
      user.password = seed.password;
      user.role = seed.role;
    }

    await userRepo.save(user);
  }
}

async function seedDatabase(): Promise<void> {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();

    const categoryMap = await seedCategories();
    const productMap = await seedProducts(categoryMap);
    await seedVariants(productMap);
    await seedWilayas();
    await seedDeliveryPlatforms();
    await seedUsers();

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void seedDatabase();