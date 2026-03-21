import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'ecommerce',
    password: 'postgres',
    port: 5432,
  });
  try {
    await client.connect();
    console.log('Connected!');
    await client.end();
  } catch (err) {
    console.error('Failed!', err);
  }
}
test();
