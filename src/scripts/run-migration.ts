import { AppDataSource } from '../config/data-source';

async function run() {
  await AppDataSource.initialize();
  console.log('DB connected');

  const pending = await AppDataSource.showMigrations();
  console.log('Pending migrations:', pending);

  await AppDataSource.runMigrations();
  console.log('All migrations applied successfully');

  await AppDataSource.destroy();
}

run().catch((e: any) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
