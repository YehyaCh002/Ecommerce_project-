import { AppDataSource } from '../config/data-source';

/**
 * Script to inspect database schema
 * This helps us understand the actual column names and types
 */
async function inspectDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();

    const tables = [
      'categories',
      'users',
      'customers',
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
      console.log(`\n📋 Table: ${table}`);
      console.log('─'.repeat(60));

      const columns = await AppDataSource.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `);

      for (const col of columns) {
        console.log(
          `  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`,
        );
      }
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

inspectDatabase();
