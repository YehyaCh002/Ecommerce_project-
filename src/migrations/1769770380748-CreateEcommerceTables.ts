import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEcommerceTables1769770380748 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL UNIQUE,
        "description" text,
        "slug" varchar(255),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create products table
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "price" decimal(10,2) NOT NULL,
        "stock" integer NOT NULL DEFAULT 0,
        "imageUrl" varchar(255),
        "sku" varchar(255),
        "isActive" boolean NOT NULL DEFAULT true,
        "categoryId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId") 
          REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    // Create orders table
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "totalAmount" decimal(10,2) NOT NULL,
        "shippingAddress" varchar(500) NOT NULL,
        "paymentMethod" varchar(255),
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create order_items table
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") 
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("productId") 
          REFERENCES "products"("id") ON DELETE SET NULL
      )
    `);

    // Create carts table
    await queryRunner.query(`
      CREATE TABLE "carts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_carts_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create cart_items table
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cartId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_cart_items_cart" FOREIGN KEY ("cartId") 
          REFERENCES "carts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cart_items_product" FOREIGN KEY ("productId") 
          REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products"("categoryId")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_isActive" ON "products"("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_user" ON "orders"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders"("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_order" ON "order_items"("orderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_product" ON "order_items"("productId")`);
    await queryRunner.query(`CREATE INDEX "IDX_carts_user" ON "carts"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_cart_items_cart" ON "cart_items"("cartId")`);
    await queryRunner.query(`CREATE INDEX "IDX_cart_items_product" ON "cart_items"("productId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_cart_items_product"`);
    await queryRunner.query(`DROP INDEX "IDX_cart_items_cart"`);
    await queryRunner.query(`DROP INDEX "IDX_carts_user"`);
    await queryRunner.query(`DROP INDEX "IDX_order_items_product"`);
    await queryRunner.query(`DROP INDEX "IDX_order_items_order"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_user"`);
    await queryRunner.query(`DROP INDEX "IDX_products_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_products_category"`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
