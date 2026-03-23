import { AppDataSource } from '../config/data-source';

/**
 * Script to verify data integrity after UUID to INT migration
 * Checks:
 * - All tables exist
 * - All IDs are integers
 * - Data counts match expectations
 * - Foreign keys are valid
 * - Sequences are correct
 */
async function verifyMigration() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();

    console.log('\n📊 Verifying Migration Results...\n');

    // Check table structure
    console.log('1️⃣ Checking table structures...');
    const tables = [
      'users',
      'customers',
      'categories',
      'products',
      'product_variants',
      'delivery_platforms',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'order_history',
    ];

    for (const table of tables) {
      const result = await AppDataSource.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${table}' AND column_name = 'id'
      `);

      if (result.length === 0) {
        console.log(`   ❌ Table "${table}" not found!`);
      } else {
        const idType = result[0].data_type;
        if (idType === 'integer') {
          console.log(`   ✅ ${table}: ID is INTEGER`);
        } else {
          console.log(`   ⚠️  ${table}: ID is ${idType} (expected INTEGER)`);
        }
      }
    }

    // Check data counts
    console.log('\n2️⃣ Checking data counts...');
    const counts = {
      users: await AppDataSource.query(`SELECT COUNT(*) as count FROM users`),
      customers: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM customers`,
      ),
      categories: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM categories`,
      ),
      products: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM products`,
      ),
      product_variants: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM product_variants`,
      ),
      delivery_platforms: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM delivery_platforms`,
      ),
      carts: await AppDataSource.query(`SELECT COUNT(*) as count FROM carts`),
      cart_items: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM cart_items`,
      ),
      orders: await AppDataSource.query(`SELECT COUNT(*) as count FROM orders`),
      order_items: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM order_items`,
      ),
      order_history: await AppDataSource.query(
        `SELECT COUNT(*) as count FROM order_history`,
      ),
    };

    for (const [table, result] of Object.entries(counts)) {
      console.log(`   📦 ${table}: ${result[0].count} records`);
    }

    // Check foreign key integrity
    console.log('\n3️⃣ Checking foreign key integrity...');

    // Products -> Categories
    const orphanProducts = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM products p
      WHERE p."categoryId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p."categoryId")
    `);
    console.log(
      `   ${orphanProducts[0].count === '0' ? '✅' : '❌'} Products with invalid categoryId: ${orphanProducts[0].count}`,
    );

    // Product Variants -> Products
    const orphanVariants = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM product_variants pv
      WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pv."productId")
    `);
    console.log(
      `   ${orphanVariants[0].count === '0' ? '✅' : '❌'} Product variants with invalid productId: ${orphanVariants[0].count}`,
    );

    // Carts -> Users
    const orphanCarts = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM carts c
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c."userId")
    `);
    console.log(
      `   ${orphanCarts[0].count === '0' ? '✅' : '❌'} Carts with invalid userId: ${orphanCarts[0].count}`,
    );

    // Orders -> Customers
    const orphanOrdersCustomer = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM orders o
      WHERE o."customerId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o."customerId")
    `);
    console.log(
      `   ${orphanOrdersCustomer[0].count === '0' ? '✅' : '❌'} Orders with invalid customerId: ${orphanOrdersCustomer[0].count}`,
    );

    // Order Items -> Products
    const orphanOrderItems = await AppDataSource.query(`
      SELECT COUNT(*) as count FROM order_items oi
      WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = oi."productId")
    `);
    console.log(
      `   ${orphanOrderItems[0].count === '0' ? '✅' : '❌'} Order items with invalid productId: ${orphanOrderItems[0].count}`,
    );

    // Check sequences
    console.log('\n4️⃣ Checking sequence values...');
    const sequences = [
      'users_id_seq',
      'customers_id_seq',
      'categories_id_seq',
      'products_id_seq',
      'product_variants_id_seq',
      'delivery_platforms_id_seq',
      'carts_id_seq',
      'cart_items_id_seq',
      'orders_id_seq',
      'order_items_id_seq',
      'order_history_id_seq',
    ];

    for (const seq of sequences) {
      const result = await AppDataSource.query(
        `SELECT last_value FROM ${seq}`,
      );
      console.log(`   📈 ${seq}: ${result[0].last_value}`);
    }

    // Check indexes
    console.log('\n5️⃣ Checking indexes...');
    const expectedIndexes = [
      'idx_customers_new_phone',
      'idx_products_new_category',
      'idx_products_new_sku',
      'idx_products_new_active',
      'idx_product_variants_new_product',
      'idx_product_variants_new_sku',
      'idx_product_variants_new_composite',
      'idx_carts_new_user',
      'idx_carts_new_active',
      'idx_cart_items_new_cart',
      'idx_cart_items_new_product',
      'idx_cart_items_new_variant',
      'idx_orders_new_status',
      'idx_orders_new_created',
      'idx_orders_new_customer',
      'idx_orders_new_assigned',
      'idx_orders_new_phone',
      'idx_orders_new_wilaya',
      'idx_order_items_new_order',
      'idx_order_items_new_product',
      'idx_order_items_new_variant',
      'idx_order_history_new_order',
      'idx_order_history_new_timestamp',
      'idx_order_history_new_user',
    ];

    const indexResult = await AppDataSource.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    `);

    const existingIndexes = indexResult.map((r: any) => r.indexname);

    for (const idx of expectedIndexes) {
      if (existingIndexes.includes(idx)) {
        console.log(`   ✅ ${idx}`);
      } else {
        console.log(`   ⚠️  ${idx} - NOT FOUND`);
      }
    }

    // Sample data check
    console.log('\n6️⃣ Sample data check...');

    const sampleUser = await AppDataSource.query(
      `SELECT id, name FROM users LIMIT 1`,
    );
    if (sampleUser.length > 0) {
      console.log(
        `   ✅ Sample user: ID=${sampleUser[0].id} (type: ${typeof sampleUser[0].id}), name=${sampleUser[0].name}`,
      );
    }

    const sampleProduct = await AppDataSource.query(
      `SELECT id, name FROM products LIMIT 1`,
    );
    if (sampleProduct.length > 0) {
      console.log(
        `   ✅ Sample product: ID=${sampleProduct[0].id} (type: ${typeof sampleProduct[0].id}), name=${sampleProduct[0].name}`,
      );
    }

    const sampleOrder = await AppDataSource.query(
      `SELECT id, "customerName" FROM orders LIMIT 1`,
    );
    if (sampleOrder.length > 0) {
      console.log(
        `   ✅ Sample order: ID=${sampleOrder[0].id} (type: ${typeof sampleOrder[0].id}), customer=${sampleOrder[0].customerName}`,
      );
    }

    console.log('\n✅ Migration verification completed!');
    console.log('\nℹ️  If you see any ❌ or ⚠️  above, please review the issues.');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during verification:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

verifyMigration();
