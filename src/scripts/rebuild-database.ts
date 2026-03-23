import { AppDataSource } from '../config/data-source';

/**
 * Script to rebuild the database schema from scratch
 * WARNING: This will DELETE ALL DATA in the database!
 * Use this script after converting from UUID to auto-increment IDs
 */
async function rebuildDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();

    console.log('⚠️  WARNING: This will DROP ALL TABLES and DATA!');
    console.log('🗑️  Dropping all tables...');
    await AppDataSource.dropDatabase();

    console.log('✅ Tables dropped successfully!');

    console.log('🔨 Creating tables with new schema...');
    await AppDataSource.synchronize();

    console.log('✅ Database schema rebuilt successfully!');
    console.log('📊 All tables now use auto-increment IDs instead of UUIDs');
    console.log('🔍 Database indexes have been created for better performance');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error rebuilding database:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

rebuildDatabase();
