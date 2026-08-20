CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Migration: CreateUserTable (1769770380747)
-- ============================================================================
BEGIN;

-- Create all enum types (must exist before tables that reference them)
CREATE TYPE "public"."orders_status_enum" AS ENUM(
  'En attente', 'Non répondu - 1ère tentative', 'Confirmé', 'OTP Confirmé',
  'Vers la Wilaya', 'Reçu à la Wilaya', 'Livré', 'Annulé', 'Commande Fictive'
);
CREATE TYPE "public"."orders_source_enum" AS ENUM(
  'Facebook', 'Instagram', 'TikTok', 'Website', 'Phone', 'Other'
);
CREATE TYPE "public"."orders_cancellationstatus_enum" AS ENUM(
  'none', 'requested', 'confirmed'
);
CREATE TYPE "public"."orders_deliverytype_enum" AS ENUM(
  'Domicile', 'Bureau', 'Yalidine Desk', 'Stop Desk'
);
CREATE TYPE "public"."orders_validationoutcome_enum" AS ENUM(
  'received', 'returned', 'exchanged', 'refused', 'unreachable', 'other'
);
CREATE TYPE "public"."order_history_action_enum" AS ENUM(
  'Créé', 'Statut Mis à Jour', 'Imprimé', 'En Préparation', 'Expédié',
  'Vers Wilaya', 'Reçu à la Wilaya', 'Message Envoyé', 'Transfert',
  'Annulé', 'Livraison Assignée', 'Échange', 'Doublon Potentiel Detecté'
);
CREATE TYPE "public"."order_history_status_enum" AS ENUM(
  'En attente', 'Non répondu - 1ère tentative', 'Confirmé', 'OTP Confirmé',
  'Vers la Wilaya', 'Reçu à la Wilaya', 'Livré', 'Annulé', 'Commande Fictive'
);
CREATE TYPE "public"."vendor_return_batches_status_enum" AS ENUM(
  'open', 'closed'
);

-- Create users table with UUID primary key (final schema from the start)
CREATE TABLE "users" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying(255) NOT NULL,
  "email" character varying(255) NOT NULL,
  "password" character varying(255),
  "role" character varying(50) NOT NULL DEFAULT 'customer',
  "avatar" character varying(500),
  "refreshToken" text,
  "oauthProvider" character varying(50),
  "oauthId" character varying(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_users_email" UNIQUE ("email")
);

CREATE UNIQUE INDEX "UQ_users_oauth_provider_id" ON "users" ("oauthProvider", "oauthId")
  WHERE "oauthProvider" IS NOT NULL AND "oauthId" IS NOT NULL;

COMMIT;

-- ============================================================================
-- Migration: CreateEcommerceTables (1769770380748)
-- ============================================================================
BEGIN;

CREATE TABLE "categories" (
  "id" SERIAL NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "slug" character varying(255),
  "parentCategoryId" integer,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_categories_name" UNIQUE ("name")
);
CREATE INDEX "IDX_categories_parentCategoryId" ON "categories" ("parentCategoryId");
ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_parent_category"
  FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "wilayas" (
  "id" SERIAL NOT NULL,
  "name" character varying(100) NOT NULL,
  "code" character varying(10) NOT NULL,
  "shippingFee" numeric(10,2),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_wilayas_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_wilayas_name" UNIQUE ("name"),
  CONSTRAINT "UQ_wilayas_code" UNIQUE ("code")
);

CREATE TABLE "customers" (
  "id" SERIAL NOT NULL,
  "name" character varying(255) NOT NULL,
  "phoneNumber" character varying(50) NOT NULL,
  "email" character varying(255),
  "defaultAddress" character varying(500),
  "totalOrdersCount" integer NOT NULL DEFAULT 0,
  "isBlacklisted" boolean NOT NULL DEFAULT false,
  "notes" text,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_customers_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_customers_phoneNumber" UNIQUE ("phoneNumber")
);
CREATE INDEX "IDX_customers_phoneNumber" ON "customers" ("phoneNumber");

CREATE TABLE "delivery_platforms" (
  "id" SERIAL NOT NULL,
  "name" character varying(100) NOT NULL,
  "apiKey" character varying(255),
  "apiSecret" character varying(255),
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_delivery_platforms_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_delivery_platforms_name" UNIQUE ("name")
);

CREATE TABLE "products" (
  "id" SERIAL NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text,
  "price" decimal(10,2) NOT NULL,
  "costPrice" decimal(10,2) NOT NULL DEFAULT 0,
  "stock" integer NOT NULL DEFAULT 0,
  "imageUrl" character varying(255),
  "sku" character varying(255),
  "isActive" boolean NOT NULL DEFAULT true,
  "isLandingPageProduct" boolean NOT NULL DEFAULT false,
  "deductStockOnConfirmation" boolean NOT NULL DEFAULT true,
  "categoryId" integer,
  "subCategoryId" integer,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_products_categoryId" ON "products" ("categoryId");
CREATE INDEX "IDX_products_subCategoryId" ON "products" ("subCategoryId");
CREATE INDEX "IDX_products_sku" ON "products" ("sku");
CREATE INDEX "IDX_products_isActive" ON "products" ("isActive");
ALTER TABLE "products" ADD CONSTRAINT "FK_products_category"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "products" ADD CONSTRAINT "FK_products_sub_category"
  FOREIGN KEY ("subCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "product_variants" (
  "id" SERIAL NOT NULL,
  "productId" integer NOT NULL,
  "size" character varying(50),
  "color" character varying(50),
  "stock" integer NOT NULL DEFAULT 0,
  "priceOverride" decimal(10,2),
  "sku" character varying(255),
  "imageUrl" character varying(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_product_variants_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_product_variants_productId" ON "product_variants" ("productId");
CREATE INDEX "IDX_product_variants_sku" ON "product_variants" ("sku");
CREATE INDEX "IDX_product_variants_product_size_color" ON "product_variants" ("productId", "size", "color");
ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_product"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "carts" (
  "id" SERIAL NOT NULL,
  "userId" uuid NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_carts_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_carts_userId" ON "carts" ("userId");
CREATE INDEX "IDX_carts_isActive" ON "carts" ("isActive");
ALTER TABLE "carts" ADD CONSTRAINT "FK_carts_user"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "cart_items" (
  "id" SERIAL NOT NULL,
  "cartId" integer NOT NULL,
  "productId" integer NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "variantId" integer,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_cart_items_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_cart_items_cartId" ON "cart_items" ("cartId");
CREATE INDEX "IDX_cart_items_productId" ON "cart_items" ("productId");
CREATE INDEX "IDX_cart_items_variantId" ON "cart_items" ("variantId");
ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_cart"
  FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_product"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_variant"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "orders" (
  "id" SERIAL NOT NULL,
  "deliveryType" "public"."orders_deliverytype_enum" DEFAULT 'Domicile',
  "soldFromStore" boolean NOT NULL DEFAULT false,
  "isValidated" boolean NOT NULL DEFAULT false,
  "isPotentialDuplicate" boolean NOT NULL DEFAULT false,
  "validationOutcome" "public"."orders_validationoutcome_enum",
  "validatedAt" TIMESTAMP,
  "customerName" character varying(255) NOT NULL,
  "phoneNumber" character varying(50) NOT NULL,
  "customerEmail" character varying(255),
  "detailedAddress" text,
  "totalPrice" decimal(10,2) NOT NULL,
  "status" "public"."orders_status_enum" NOT NULL DEFAULT 'En attente',
  "cancellationStatus" "public"."orders_cancellationstatus_enum" NOT NULL DEFAULT 'none',
  "cancellationReason" text,
  "rating" integer,
  "source" "public"."orders_source_enum" NOT NULL DEFAULT 'Other',
  "tracking_status" character varying(100),
  "current_sub_status" character varying(100),
  "last_status_change_at" TIMESTAMP,
  "trackingNumber" character varying(100),
  "isDelayed" boolean NOT NULL DEFAULT false,
  "wilayaId" integer,
  "assignedToId" uuid,
  "customerId" integer,
  "userId" uuid,
  "shippingAddress" character varying(500),
  "paymentMethod" character varying(255),
  "deliveryPlatformId" integer,
  "isExchange" boolean NOT NULL DEFAULT false,
  "exchangePrice" decimal(10,2) NOT NULL DEFAULT 0,
  "productToCollect" text,
  "isFreeShipping" boolean NOT NULL DEFAULT false,
  "hasInsurance" boolean NOT NULL DEFAULT false,
  "shippingFee" decimal(10,2) NOT NULL DEFAULT 0,
  "remark" text,
  "internalComment" text,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_orders_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_orders_status" ON "orders" ("status");
CREATE INDEX "IDX_orders_createdAt" ON "orders" ("createdAt");
CREATE INDEX "IDX_orders_customerId" ON "orders" ("customerId");
CREATE INDEX "IDX_orders_assignedToId" ON "orders" ("assignedToId");
CREATE INDEX "IDX_orders_phoneNumber" ON "orders" ("phoneNumber");
CREATE INDEX "IDX_orders_wilayaId" ON "orders" ("wilayaId");
CREATE INDEX "IDX_orders_last_status_change_at" ON "orders" ("last_status_change_at");
ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_wilaya"
  FOREIGN KEY ("wilayaId") REFERENCES "wilayas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_assignedTo"
  FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_customer"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_deliveryPlatform"
  FOREIGN KEY ("deliveryPlatformId") REFERENCES "delivery_platforms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_user"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "order_items" (
  "id" SERIAL NOT NULL,
  "orderId" integer NOT NULL,
  "productId" integer NOT NULL,
  "quantity" integer NOT NULL,
  "price" decimal(10,2) NOT NULL,
  "variantId" integer,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId");
CREATE INDEX "IDX_order_items_productId" ON "order_items" ("productId");
CREATE INDEX "IDX_order_items_variantId" ON "order_items" ("variantId");
ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_product"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_variant"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "order_history" (
  "id" SERIAL NOT NULL,
  "orderId" integer NOT NULL,
  "action" "public"."order_history_action_enum" NOT NULL DEFAULT 'Créé',
  "status" "public"."order_history_status_enum",
  "details" text,
  "changedByUserId" uuid,
  "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_order_history_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_order_history_orderId" ON "order_history" ("orderId");
CREATE INDEX "IDX_order_history_timestamp" ON "order_history" ("timestamp");
CREATE INDEX "IDX_order_history_changedByUserId" ON "order_history" ("changedByUserId");
ALTER TABLE "order_history" ADD CONSTRAINT "FK_order_history_order"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "order_history" ADD CONSTRAINT "FK_order_history_changedByUser"
  FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "tracking_logs" (
  "id" SERIAL NOT NULL,
  "orderId" integer NOT NULL,
  "status" character varying(100) NOT NULL,
  "sub_status" character varying(100),
  "description" text,
  "location" character varying(255),
  "actor" character varying(255),
  "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_tracking_logs_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_tracking_logs_orderId" ON "tracking_logs" ("orderId");
CREATE INDEX "IDX_tracking_logs_timestamp" ON "tracking_logs" ("timestamp");
ALTER TABLE "tracking_logs" ADD CONSTRAINT "FK_tracking_logs_order"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "stock_movements" (
  "id" SERIAL NOT NULL,
  "productId" integer NOT NULL,
  "type" character varying(50) NOT NULL DEFAULT 'manual',
  "totalChanges" integer NOT NULL DEFAULT 0,
  "oldStock" integer NOT NULL,
  "newStock" integer NOT NULL,
  "details" jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_stock_movements_productId" ON "stock_movements" ("productId");
CREATE INDEX "IDX_stock_movements_type" ON "stock_movements" ("type");
CREATE INDEX "IDX_stock_movements_createdAt" ON "stock_movements" ("createdAt");
ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_product"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "vendor_return_batches" (
  "id" SERIAL NOT NULL,
  "deliveryPlatformId" integer,
  "dischargeReference" character varying(255) NOT NULL,
  "expectedCount" integer NOT NULL DEFAULT 0,
  "expectedTrackingNumbers" jsonb,
  "status" "public"."vendor_return_batches_status_enum" NOT NULL DEFAULT 'open',
  "notes" text,
  "closedAt" TIMESTAMP,
  "createdByUserId" uuid,
  "closedByUserId" uuid,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_vendor_return_batches_id" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_vendor_return_batches_createdAt" ON "vendor_return_batches" ("createdAt");
CREATE INDEX "IDX_vendor_return_batches_status" ON "vendor_return_batches" ("status");
ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_vendor_return_batches_delivery_platform"
  FOREIGN KEY ("deliveryPlatformId") REFERENCES "delivery_platforms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_vendor_return_batches_created_by_user"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_vendor_return_batches_closed_by_user"
  FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "vendor_return_scans" (
  "id" SERIAL NOT NULL,
  "batchId" integer NOT NULL,
  "orderId" integer,
  "trackingNumber" character varying(100) NOT NULL,
  "scannedByUserId" uuid,
  "scannedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_vendor_return_scans_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_vendor_return_scans_batch_tracking" UNIQUE ("batchId", "trackingNumber")
);
CREATE INDEX "IDX_vendor_return_scans_batchId" ON "vendor_return_scans" ("batchId");
CREATE INDEX "IDX_vendor_return_scans_trackingNumber" ON "vendor_return_scans" ("trackingNumber");
ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_vendor_return_scans_batch"
  FOREIGN KEY ("batchId") REFERENCES "vendor_return_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_vendor_return_scans_order"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_vendor_return_scans_user"
  FOREIGN KEY ("scannedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT;

-- ============================================================================
-- Migration: UpdateOrderEntityAndAddWilayaAndHistory (1771506122903)
-- Skipped: wilayas, order_history, orders columns, enums, and FKs were all
-- created in their final form in the migrations above.
-- ============================================================================
BEGIN;

-- No-op for fresh database: all structures already created in Migration 2.

COMMIT;

-- ============================================================================
-- Migration: FixDatabaseIntegrityIssues (1771506122904)
-- Skipped: This migration fixes data integrity issues (typo tables, duplicate
-- categories, invalid UUIDs, orphaned FK references). Not needed for a fresh
-- empty database.
-- ============================================================================
BEGIN;

-- No-op for fresh database: no data to clean up.

COMMIT;

-- ============================================================================
-- Migration: RefactorOrderHistory (1773331122900)
-- Skipped: order_history was created with action/status/details columns
-- directly in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: order_history already has correct schema.

COMMIT;

-- ============================================================================
-- Migration: AddCustomerTable (1774049747084)
-- Skipped: customers table was created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: customers table already exists.

COMMIT;

-- ============================================================================
-- Migration: AddDeliveryPlatformAndTimer (1774050242936)
-- Skipped: delivery_platforms table was created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: delivery_platforms table already exists.

COMMIT;

-- ============================================================================
-- Migration: AddIsValidatedToOrder (1774194871221)
-- Skipped: isValidated, deliveryType (enum), and all enum types were created
-- in Migration 1 and Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: all columns and types already exist.

COMMIT;

-- ============================================================================
-- Migration: AddOrderCancellationFields (1774387429369)
-- Skipped: cancellationStatus and cancellationReason columns and the enum
-- type were created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: columns already exist.

COMMIT;

-- ============================================================================
-- Migration: AddPotentialDuplicateAlert (1774447382530)
-- Skipped: isPotentialDuplicate column and updated action enum were created
-- in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: column and enum already exist.

COMMIT;

-- ============================================================================
-- Migration: AddTrackingSystem (1774966572305)
-- Skipped: tracking_logs table and orders tracking columns were created in
-- Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: tracking_logs already exists.

COMMIT;

-- ============================================================================
-- Migration: ManualUpdateOrderExchangeAndShipping (1775132845359)
-- Skipped: remark, internalComment, shippingFee, isExchange, exchangePrice,
-- productToCollect, isFreeShipping, hasInsurance columns were all created in
-- Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: columns already exist.

COMMIT;

-- ============================================================================
-- Migration: AddEmailAndDetailedAddressToOrder (1775138123456)
-- Skipped: customerEmail and detailedAddress columns were created in
-- Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: columns already exist.

COMMIT;

-- ============================================================================
-- Migration: AddDeliveryTypeAndStoreFlag (1775139000000)
-- Skipped: deliveryType and soldFromStore columns were created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: columns already exist.

COMMIT;

-- ============================================================================
-- Migration: AddProductVariants (1775140000000)
-- Skipped: product_variants table, variantId columns on order_items and
-- cart_items, and all related indexes/FKs were created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: product_variants already exists.

COMMIT;

-- ============================================================================
-- Migration: AddOrderValidationOutcome (1776001000000)
-- Skipped: validationOutcome and validatedAt columns and the enum type were
-- created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: columns and enum already exist.

COMMIT;

-- ============================================================================
-- Migration: ConvertUuidToAutoIncrement (1776002000000)
-- Skipped: This migration converts UUID primary keys to auto-increment INTs.
-- Since we created all tables with SERIAL IDs from the start, this is not
-- needed.
-- ============================================================================
BEGIN;

-- No-op for fresh database: tables already use SERIAL IDs.

COMMIT;

-- ============================================================================
-- Migration: ConvertUserIdToUuid (1777000000000)
-- Skipped: This migration converts users.id back to UUID after the serial
-- conversion. Since users was created with UUID PK from the start, this is
-- not needed.
-- ============================================================================
BEGIN;

-- No-op for fresh database: users.id is already UUID.

COMMIT;

-- ============================================================================
-- Migration: EnsurePotentialDuplicateColumn (1777003000000)
-- Skipped: isPotentialDuplicate column was created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: column already exists.

COMMIT;

-- ============================================================================
-- Migration: AddStockMovements (1778004000000)
-- Skipped: stock_movements table was created in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: stock_movements already exists.

COMMIT;

-- ============================================================================
-- Migration: AddVendorReturnBatches (1778105000000)
-- Skipped: vendor_return_batches and vendor_return_scans tables were created
-- in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: tables already exist.

COMMIT;

-- ============================================================================
-- Migration: AddProductAdvancedFieldsAndSubCategories (1778206000000)
-- Skipped: parentCategoryId, costPrice, subCategoryId, isLandingPageProduct,
-- deductStockOnConfirmation, and product_variants.imageUrl were all created
-- in Migration 2.
-- ============================================================================
BEGIN;

-- No-op for fresh database: columns already exist.

COMMIT;

-- ============================================================================
-- Migration: AddRefreshTokenToUser (1779289668105)
-- Skipped: refreshToken column on users was created in Migration 1. Index
-- recreation is not needed for a fresh database.
-- ============================================================================
BEGIN;

-- No-op for fresh database: refreshToken column already exists.

COMMIT;

-- ============================================================================
-- Migration: AddOAuthToUser (1780000000000)
-- Skipped: oauthProvider, oauthId columns and the partial unique index were
-- created in Migration 1. Password nullable was set from the start.
-- ============================================================================
BEGIN;

-- No-op for fresh database: OAuth columns already exist.

COMMIT;
