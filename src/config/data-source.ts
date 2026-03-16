import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Wilaya } from '../entities/Wilaya';
import { OrderHistory } from '../entities/OrderHistory';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ecommerce',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Product, Category, Order, OrderItem, Cart, CartItem, Wilaya, OrderHistory],
  migrations: [
    process.env.NODE_ENV === 'production' 
      ? 'dist/migrations/**/*.js' 
      : 'src/migrations/**/*.ts'
  ],
  subscribers: [],
});
