import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Convert UUID to Auto-Increment IDs
 * Based on ACTUAL database schema (inspected on 2026-03-23)
 */
export class ConvertUuidToAutoIncrement1776002000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Starting UUID to Auto-Increment migration...');

    // Check if categories.id is already integer
    const columnCheck = await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'id'
    `);
    
    if (columnCheck[0] && columnCheck[0].data_type === 'integer') {
      console.log('⏩ Skipping UUID schema migration (already migrated or synchronized directly to IDs)');
      return;
    }

    // ============================================
    // PHASE 1: Create mapping tables
    // ============================================

    console.log('Phase 1: Creating UUID to INT mapping tables...');

    await queryRunner.query(`
      CREATE TABLE uuid_mapping_category (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_user (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_customer (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_delivery_platform (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_product (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_product_variant (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_cart (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_cart_item (old_uuid UUID PRIMARY KEY, new_id SERIAL);
      CREATE TABLE uuid_mapping_order_item (old_uuid UUID PRIMARY KEY, new_id SERIAL);
    `);

    // ============================================
    // PHASE 2: Populate mapping tables
    // ============================================

    console.log('Phase 2: Populating mapping tables...');

    await queryRunner.query(
      `INSERT INTO uuid_mapping_category (old_uuid) SELECT id FROM categories ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_user (old_uuid) SELECT id FROM users ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_customer (old_uuid) SELECT id FROM customers ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_delivery_platform (old_uuid) SELECT id FROM delivery_platforms ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_product (old_uuid) SELECT id FROM products ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_product_variant (old_uuid) SELECT id FROM product_variants ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_cart (old_uuid) SELECT id FROM carts ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_cart_item (old_uuid) SELECT id FROM cart_items ORDER BY "createdAt"`,
    );
    await queryRunner.query(
      `INSERT INTO uuid_mapping_order_item (old_uuid) SELECT id FROM order_items ORDER BY "createdAt"`,
    );

    // ============================================
    // PHASE 3: Create new tables with INT IDs
    // ============================================

    console.log('Phase 3: Creating new tables with INT IDs...');

    // Categories (actual columns: id, name, description, slug)
    await queryRunner.query(`
      CREATE TABLE categories_new (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        slug VARCHAR(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Users (actual columns: id, name, email, password, role, avatar)
    await queryRunner.query(`
      CREATE TABLE users_new (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        avatar VARCHAR(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Customers (actual columns: id, name, phoneNumber, email, defaultAddress, totalOrdersCount, isBlacklisted, notes)
    await queryRunner.query(`
      CREATE TABLE customers_new (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "phoneNumber" VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        "defaultAddress" VARCHAR(255),
        "totalOrdersCount" INT NOT NULL DEFAULT 0,
        "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_customers_new_phone ON customers_new("phoneNumber");
    `);

    // Delivery Platforms
    await queryRunner.query(`
      CREATE TABLE delivery_platforms_new (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        "apiKey" VARCHAR(255),
        "apiSecret" VARCHAR(255),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Products (actual columns: id, name, description, price, stock, imageUrl, sku, isActive, categoryId)
    await queryRunner.query(`
      CREATE TABLE products_new (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        "imageUrl" VARCHAR(255),
        sku VARCHAR(100),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "categoryId" INT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY ("categoryId") REFERENCES categories_new(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_products_new_category ON products_new("categoryId");
      CREATE INDEX idx_products_new_sku ON products_new(sku);
      CREATE INDEX idx_products_new_active ON products_new("isActive");
    `);

    // Product Variants
    await queryRunner.query(`
      CREATE TABLE product_variants_new (
        id SERIAL PRIMARY KEY,
        "productId" INT NOT NULL,
        size VARCHAR(50),
        color VARCHAR(50),
        stock INT NOT NULL DEFAULT 0,
        "priceOverride" DECIMAL(10,2),
        sku VARCHAR(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY ("productId") REFERENCES products_new(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_product_variants_new_product ON product_variants_new("productId");
      CREATE INDEX idx_product_variants_new_sku ON product_variants_new(sku);
      CREATE INDEX idx_product_variants_new_composite ON product_variants_new("productId", size, color);
    `);

    // Carts
    await queryRunner.query(`
      CREATE TABLE carts_new (
        id SERIAL PRIMARY KEY,
        "userId" INT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY ("userId") REFERENCES users_new(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_carts_new_user ON carts_new("userId");
      CREATE INDEX idx_carts_new_active ON carts_new("isActive");
    `);

    // Cart Items
    await queryRunner.query(`
      CREATE TABLE cart_items_new (
        id SERIAL PRIMARY KEY,
        "cartId" INT NOT NULL,
        "productId" INT NOT NULL,
        "variantId" INT,
        quantity INT NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY ("cartId") REFERENCES carts_new(id) ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES products_new(id) ON DELETE CASCADE,
        FOREIGN KEY ("variantId") REFERENCES product_variants_new(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_cart_items_new_cart ON cart_items_new("cartId");
      CREATE INDEX idx_cart_items_new_product ON cart_items_new("productId");
      CREATE INDEX idx_cart_items_new_variant ON cart_items_new("variantId");
    `);

    // Orders (already INT id, but update foreign keys)
    await queryRunner.query(`
      CREATE TABLE orders_new (
        id SERIAL PRIMARY KEY,
        "userId" INT,
        "totalPrice" DECIMAL(10,2) NOT NULL,
        "shippingAddress" VARCHAR(500),
        "paymentMethod" VARCHAR(255),
        remark TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "customerName" VARCHAR(255) NOT NULL,
        "phoneNumber" VARCHAR(50) NOT NULL,
        rating INT,
        source VARCHAR(50) NOT NULL,
        "trackingNumber" VARCHAR(100),
        "isDelayed" BOOLEAN NOT NULL DEFAULT false,
        "wilayaId" INT,
        "assignedToId" INT,
        status VARCHAR(50) NOT NULL,
        "customerId" INT,
        "deliveryPlatformId" INT,
        "internalComment" TEXT,
        "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "isExchange" BOOLEAN NOT NULL DEFAULT false,
        "exchangePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "productToCollect" TEXT,
        "isFreeShipping" BOOLEAN NOT NULL DEFAULT false,
        "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
        "customerEmail" VARCHAR(255),
        "detailedAddress" TEXT,
        "soldFromStore" BOOLEAN NOT NULL DEFAULT false,
        "isValidated" BOOLEAN NOT NULL DEFAULT false,
        "deliveryType" VARCHAR(50),
        "validationOutcome" VARCHAR(50),
        "validatedAt" TIMESTAMP,
        FOREIGN KEY ("wilayaId") REFERENCES wilayas(id) ON DELETE SET NULL,
        FOREIGN KEY ("assignedToId") REFERENCES users_new(id) ON DELETE SET NULL,
        FOREIGN KEY ("customerId") REFERENCES customers_new(id) ON DELETE SET NULL,
        FOREIGN KEY ("deliveryPlatformId") REFERENCES delivery_platforms_new(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_orders_new_status ON orders_new(status);
      CREATE INDEX idx_orders_new_created ON orders_new("createdAt");
      CREATE INDEX idx_orders_new_customer ON orders_new("customerId");
      CREATE INDEX idx_orders_new_assigned ON orders_new("assignedToId");
      CREATE INDEX idx_orders_new_phone ON orders_new("phoneNumber");
      CREATE INDEX idx_orders_new_wilaya ON orders_new("wilayaId");
    `);

    // Order Items
    await queryRunner.query(`
      CREATE TABLE order_items_new (
        id SERIAL PRIMARY KEY,
        "orderId" INT NOT NULL,
        "productId" INT NOT NULL,
        "variantId" INT,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY ("orderId") REFERENCES orders_new(id) ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES products_new(id) ON DELETE SET NULL,
        FOREIGN KEY ("variantId") REFERENCES product_variants_new(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_order_items_new_order ON order_items_new("orderId");
      CREATE INDEX idx_order_items_new_product ON order_items_new("productId");
      CREATE INDEX idx_order_items_new_variant ON order_items_new("variantId");
    `);

    // Order History
    await queryRunner.query(`
      CREATE TABLE order_history_new (
        id SERIAL PRIMARY KEY,
        "orderId" INT NOT NULL,
        "changedByUserId" INT,
        timestamp TIMESTAMP NOT NULL DEFAULT now(),
        details TEXT,
        action VARCHAR(50) NOT NULL,
        status VARCHAR(50),
        FOREIGN KEY ("orderId") REFERENCES orders_new(id) ON DELETE CASCADE,
        FOREIGN KEY ("changedByUserId") REFERENCES users_new(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_order_history_new_order ON order_history_new("orderId");
      CREATE INDEX idx_order_history_new_timestamp ON order_history_new(timestamp);
      CREATE INDEX idx_order_history_new_user ON order_history_new("changedByUserId");
    `);

    // ============================================
    // PHASE 4: Copy data with ID mapping
    // ============================================

    console.log('Phase 4: Copying data to new tables...');

    // Copy Categories
    await queryRunner.query(`
      INSERT INTO categories_new (id, name, description, slug, "createdAt", "updatedAt")
      SELECT m.new_id, c.name, c.description, c.slug, c."createdAt", c."updatedAt"
      FROM categories c
      JOIN uuid_mapping_category m ON c.id = m.old_uuid
      ORDER BY m.new_id
    `);

    // Copy Users
    await queryRunner.query(`
      INSERT INTO users_new (id, name, email, password, role, avatar, "createdAt", "updatedAt")
      SELECT m.new_id, u.name, u.email, u.password, u.role, u.avatar, u."createdAt", u."updatedAt"
      FROM users u
      JOIN uuid_mapping_user m ON u.id = m.old_uuid
      ORDER BY m.new_id
    `);

    // Copy Customers
    await queryRunner.query(`
      INSERT INTO customers_new (id, name, "phoneNumber", email, "defaultAddress", "totalOrdersCount", "isBlacklisted", notes, "createdAt", "updatedAt")
      SELECT m.new_id, c.name, c."phoneNumber", c.email, c."defaultAddress", c."totalOrdersCount", c."isBlacklisted", c.notes, c."createdAt", c."updatedAt"
      FROM customers c
      JOIN uuid_mapping_customer m ON c.id = m.old_uuid
      ORDER BY m.new_id
    `);

    // Copy Delivery Platforms
    await queryRunner.query(`
      INSERT INTO delivery_platforms_new (id, name, "apiKey", "apiSecret", "isActive", "createdAt", "updatedAt")
      SELECT m.new_id, d.name, d."apiKey", d."apiSecret", d."isActive", d."createdAt", d."updatedAt"
      FROM delivery_platforms d
      JOIN uuid_mapping_delivery_platform m ON d.id = m.old_uuid
      ORDER BY m.new_id
    `);

    // Copy Products
    await queryRunner.query(`
      INSERT INTO products_new (id, name, description, price, stock, "imageUrl", sku, "isActive", "categoryId", "createdAt", "updatedAt")
      SELECT
        mp.new_id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p."imageUrl",
        p.sku,
        p."isActive",
        mc.new_id,
        p."createdAt",
        p."updatedAt"
      FROM products p
      JOIN uuid_mapping_product mp ON p.id = mp.old_uuid
      LEFT JOIN uuid_mapping_category mc ON p."categoryId" = mc.old_uuid
      ORDER BY mp.new_id
    `);

    // Copy Product Variants
    await queryRunner.query(`
      INSERT INTO product_variants_new (id, "productId", size, color, stock, "priceOverride", sku, "createdAt", "updatedAt")
      SELECT
        mv.new_id,
        mp.new_id,
        v.size,
        v.color,
        v.stock,
        v."priceOverride",
        v.sku,
        v."createdAt",
        v."updatedAt"
      FROM product_variants v
      JOIN uuid_mapping_product_variant mv ON v.id = mv.old_uuid
      JOIN uuid_mapping_product mp ON v."productId" = mp.old_uuid
      ORDER BY mv.new_id
    `);

    // Copy Carts
    await queryRunner.query(`
      INSERT INTO carts_new (id, "userId", "isActive", "createdAt", "updatedAt")
      SELECT
        mc.new_id,
        mu.new_id,
        c."isActive",
        c."createdAt",
        c."updatedAt"
      FROM carts c
      JOIN uuid_mapping_cart mc ON c.id = mc.old_uuid
      JOIN uuid_mapping_user mu ON c."userId" = mu.old_uuid
      ORDER BY mc.new_id
    `);

    // Copy Cart Items
    await queryRunner.query(`
      INSERT INTO cart_items_new (id, "cartId", "productId", "variantId", quantity, "createdAt", "updatedAt")
      SELECT
        mci.new_id,
        mc.new_id,
        mp.new_id,
        mv.new_id,
        ci.quantity,
        ci."createdAt",
        ci."updatedAt"
      FROM cart_items ci
      JOIN uuid_mapping_cart_item mci ON ci.id = mci.old_uuid
      JOIN uuid_mapping_cart mc ON ci."cartId" = mc.old_uuid
      JOIN uuid_mapping_product mp ON ci."productId" = mp.old_uuid
      LEFT JOIN uuid_mapping_product_variant mv ON ci."variantId" = mv.old_uuid
      ORDER BY mci.new_id
    `);

    // Copy Orders
    await queryRunner.query(`
      INSERT INTO orders_new (
        id, "userId", "totalPrice", "shippingAddress", "paymentMethod", remark, "createdAt", "updatedAt",
        "customerName", "phoneNumber", rating, source, "trackingNumber", "isDelayed", "wilayaId",
        "assignedToId", status, "customerId", "deliveryPlatformId", "internalComment",
        "shippingFee", "isExchange", "exchangePrice", "productToCollect", "isFreeShipping",
        "hasInsurance", "customerEmail", "detailedAddress", "soldFromStore", "isValidated",
        "deliveryType", "validationOutcome", "validatedAt"
      )
      SELECT
        o.id,
        mu.new_id,
        o."totalPrice",
        o."shippingAddress",
        o."paymentMethod",
        o.remark,
        o."createdAt",
        o."updatedAt",
        o."customerName",
        o."phoneNumber",
        o.rating,
        o.source::text,
        o."trackingNumber",
        o."isDelayed",
        o."wilayaId",
        mu_assigned.new_id,
        o.status::text,
        mc.new_id,
        md.new_id,
        o."internalComment",
        o."shippingFee",
        o."isExchange",
        o."exchangePrice",
        o."productToCollect",
        o."isFreeShipping",
        o."hasInsurance",
        o."customerEmail",
        o."detailedAddress",
        o."soldFromStore",
        o."isValidated",
        o."deliveryType"::text,
        o."validationOutcome"::text,
        o."validatedAt"
      FROM orders o
      LEFT JOIN uuid_mapping_user mu ON o."userId" = mu.old_uuid
      LEFT JOIN uuid_mapping_user mu_assigned ON o."assignedToId" = mu_assigned.old_uuid
      LEFT JOIN uuid_mapping_customer mc ON o."customerId" = mc.old_uuid
      LEFT JOIN uuid_mapping_delivery_platform md ON o."deliveryPlatformId" = md.old_uuid
      ORDER BY o.id
    `);

    // Copy Order Items
    await queryRunner.query(`
      INSERT INTO order_items_new (id, "orderId", "productId", "variantId", quantity, price, "createdAt")
      SELECT
        moi.new_id,
        oi."orderId",
        mp.new_id,
        mv.new_id,
        oi.quantity,
        oi.price,
        oi."createdAt"
      FROM order_items oi
      JOIN uuid_mapping_order_item moi ON oi.id = moi.old_uuid
      JOIN uuid_mapping_product mp ON oi."productId" = mp.old_uuid
      LEFT JOIN uuid_mapping_product_variant mv ON oi."variantId" = mv.old_uuid
      ORDER BY moi.new_id
    `);

    // Copy Order History
    await queryRunner.query(`
      INSERT INTO order_history_new (id, "orderId", "changedByUserId", timestamp, details, action, status)
      SELECT
        oh.id,
        oh."orderId",
        mu.new_id,
        oh.timestamp,
        oh.details,
        oh.action::text,
        oh.status::text
      FROM order_history oh
      LEFT JOIN uuid_mapping_user mu ON oh."changedByUserId" = mu.old_uuid
      ORDER BY oh.id
    `);

    // ============================================
    // PHASE 5: Update sequences
    // ============================================

    console.log('Phase 5: Updating sequences...');

    await queryRunner.query(
      `SELECT setval('categories_new_id_seq', (SELECT MAX(id) FROM categories_new))`,
    );
    await queryRunner.query(
      `SELECT setval('users_new_id_seq', (SELECT MAX(id) FROM users_new))`,
    );
    await queryRunner.query(
      `SELECT setval('customers_new_id_seq', (SELECT MAX(id) FROM customers_new))`,
    );
    await queryRunner.query(
      `SELECT setval('delivery_platforms_new_id_seq', (SELECT MAX(id) FROM delivery_platforms_new))`,
    );
    await queryRunner.query(
      `SELECT setval('products_new_id_seq', (SELECT MAX(id) FROM products_new))`,
    );
    await queryRunner.query(
      `SELECT setval('product_variants_new_id_seq', (SELECT MAX(id) FROM product_variants_new))`,
    );
    await queryRunner.query(
      `SELECT setval('carts_new_id_seq', (SELECT MAX(id) FROM carts_new))`,
    );
    await queryRunner.query(
      `SELECT setval('cart_items_new_id_seq', (SELECT MAX(id) FROM cart_items_new))`,
    );
    await queryRunner.query(
      `SELECT setval('orders_new_id_seq', (SELECT MAX(id) FROM orders_new))`,
    );
    await queryRunner.query(
      `SELECT setval('order_items_new_id_seq', (SELECT MAX(id) FROM order_items_new))`,
    );
    await queryRunner.query(
      `SELECT setval('order_history_new_id_seq', (SELECT MAX(id) FROM order_history_new))`,
    );

    // ============================================
    // PHASE 6: Drop old tables and rename new ones
    // ============================================

    console.log('Phase 6: Dropping old tables and renaming new ones...');

    // Drop old tables in correct order
    await queryRunner.query(`DROP TABLE IF EXISTS order_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cart_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS carts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_variants CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS products CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS delivery_platforms CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS customers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories CASCADE`);

    // Rename new tables
    await queryRunner.query(`ALTER TABLE categories_new RENAME TO categories`);
    await queryRunner.query(`ALTER TABLE users_new RENAME TO users`);
    await queryRunner.query(`ALTER TABLE customers_new RENAME TO customers`);
    await queryRunner.query(
      `ALTER TABLE delivery_platforms_new RENAME TO delivery_platforms`,
    );
    await queryRunner.query(`ALTER TABLE products_new RENAME TO products`);
    await queryRunner.query(
      `ALTER TABLE product_variants_new RENAME TO product_variants`,
    );
    await queryRunner.query(`ALTER TABLE carts_new RENAME TO carts`);
    await queryRunner.query(`ALTER TABLE cart_items_new RENAME TO cart_items`);
    await queryRunner.query(`ALTER TABLE orders_new RENAME TO orders`);
    await queryRunner.query(
      `ALTER TABLE order_items_new RENAME TO order_items`,
    );
    await queryRunner.query(
      `ALTER TABLE order_history_new RENAME TO order_history`,
    );

    // Rename sequences
    await queryRunner.query(
      `ALTER SEQUENCE categories_new_id_seq RENAME TO categories_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE users_new_id_seq RENAME TO users_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE customers_new_id_seq RENAME TO customers_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE delivery_platforms_new_id_seq RENAME TO delivery_platforms_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE products_new_id_seq RENAME TO products_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE product_variants_new_id_seq RENAME TO product_variants_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE carts_new_id_seq RENAME TO carts_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE cart_items_new_id_seq RENAME TO cart_items_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE orders_new_id_seq RENAME TO orders_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE order_items_new_id_seq RENAME TO order_items_id_seq`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE order_history_new_id_seq RENAME TO order_history_id_seq`,
    );

    // ============================================
    // PHASE 7: Cleanup mapping tables
    // ============================================

    console.log('Phase 7: Cleaning up mapping tables...');

    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_category`);
    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_customer`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS uuid_mapping_delivery_platform`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_product`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS uuid_mapping_product_variant`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_cart`);
    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_cart_item`);
    await queryRunner.query(`DROP TABLE IF EXISTS uuid_mapping_order_item`);

    console.log('✅ Migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {    const columnCheck = await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'id'
    `);
    
    if (columnCheck[0] && columnCheck[0].data_type === 'integer') {
      const mappingCheck = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'uuid_mapping_category'
        )
      `);
      if (!mappingCheck[0] || !mappingCheck[0].exists) {
        console.log('⏩ Skipping revert (no mapping table found)');
        return;
      }
    }
    throw new Error(
      'This migration cannot be reverted automatically. Please restore from backup.',
    );
  }
}
