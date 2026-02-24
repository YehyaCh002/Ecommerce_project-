import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrderEntityAndAddWilayaAndHistory1771506122903 implements MigrationInterface {
    name = 'UpdateOrderEntityAndAddWilayaAndHistory1771506122903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_carts_user"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_cart"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_product"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_category"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_product"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_carts_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cart_items_cart"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cart_items_product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_products_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_products_isActive"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_items_order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_items_product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_status"`);
        await queryRunner.query(`CREATE TABLE "wilayas" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "code" character varying(10) NOT NULL, "shippingFee" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe03871dc5b980347e04e06fc3d" UNIQUE ("name"), CONSTRAINT "UQ_32052c4ea95aa7ae74b41a761f6" UNIQUE ("code"), CONSTRAINT "PK_fee33960793c27e45b3162eb0d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_history" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "oldStatus" character varying(100), "newStatus" character varying(100) NOT NULL, "changedByUserId" uuid, "note" text, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cc71513680d03ecb01b96655b0c" PRIMARY KEY ("id"))`);
        
        // Store totalAmount as totalPrice before dropping
        await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "totalAmount" TO "totalPrice"`);
        
        // Add new columns as nullable first
        await queryRunner.query(`ALTER TABLE "orders" ADD "customerName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "phoneNumber" character varying(50)`);
        
        // Update existing records with default values from user data
        await queryRunner.query(`
            UPDATE "orders" o
            SET "customerName" = u.name,
                "phoneNumber" = '0000000000'
            FROM "users" u
            WHERE o."userId" = u.id
        `);
        
        // Set default for any remaining null values
        await queryRunner.query(`UPDATE "orders" SET "customerName" = 'Customer' WHERE "customerName" IS NULL`);
        await queryRunner.query(`UPDATE "orders" SET "phoneNumber" = '0000000000' WHERE "phoneNumber" IS NULL`);
        
        // Now make them NOT NULL
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "customerName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "phoneNumber" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "customerName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "phoneNumber" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "totalPrice" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "rating" integer`);
        await queryRunner.query(`CREATE TYPE "public"."orders_source_enum" AS ENUM('Facebook', 'Instagram', 'TikTok', 'Website', 'Phone', 'Other')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "source" "public"."orders_source_enum" NOT NULL DEFAULT 'Other'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "trackingNumber" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "isDelayed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "wilayaId" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "assignedToId" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar" character varying(500)`);
        
        // Create a temporary mapping table for old UUID to new integer IDs
        await queryRunner.query(`CREATE TABLE "temp_order_id_mapping" ("old_id" uuid, "new_id" integer)`);
        
        // Store old order data with new sequential IDs
        await queryRunner.query(`
            INSERT INTO "temp_order_id_mapping" ("old_id", "new_id")
            SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") FROM "orders"
        `);
        
        // Add temporary new_id column to orders
        await queryRunner.query(`ALTER TABLE "orders" ADD "new_id" integer`);
        await queryRunner.query(`
            UPDATE "orders" o
            SET "new_id" = m."new_id"
            FROM "temp_order_id_mapping" m
            WHERE o.id = m."old_id"
        `);
        
        // Update order_items with new IDs
        await queryRunner.query(`ALTER TABLE "order_items" ADD "new_orderId" integer`);
        await queryRunner.query(`
            UPDATE "order_items" oi
            SET "new_orderId" = m."new_id"
            FROM "temp_order_id_mapping" m
            WHERE oi."orderId" = m."old_id"
        `);
        
        // Drop old orderId column and rename new one
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "orderId"`);
        await queryRunner.query(`ALTER TABLE "order_items" RENAME COLUMN "new_orderId" TO "orderId"`);
        await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "orderId" SET NOT NULL`);
        
        // Drop old id and rename new one in orders
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "orders_pkey"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "new_id" TO "id"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")`);
        
        // Clean up temp table
        await queryRunner.query(`DROP TABLE "temp_order_id_mapping"`);        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('En attente', 'Non répondu - 1ère tentative', 'Confirmé', 'OTP Confirmé', 'Vers la Wilaya', 'Reçu à la Wilaya', 'Livré', 'Annulé', 'Commande Fictive')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "status" "public"."orders_status_enum" NOT NULL DEFAULT 'En attente'`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "shippingAddress" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "carts" ADD CONSTRAINT "FK_69828a178f152f157dcf2f70a89" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_edd714311619a5ad09525045838" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_72679d98b31c737937b8932ebe6" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD CONSTRAINT "FK_e15b4a73a3e53311433968993cc" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD CONSTRAINT "FK_0af6da01c049f96d7954888e85a" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_4be52755ec6531d3533238bc2de" FOREIGN KEY ("wilayaId") REFERENCES "wilayas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_58196933a1c73fc71d2149d39b6" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_58196933a1c73fc71d2149d39b6"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_4be52755ec6531d3533238bc2de"`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP CONSTRAINT "FK_0af6da01c049f96d7954888e85a"`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP CONSTRAINT "FK_e15b4a73a3e53311433968993cc"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_72679d98b31c737937b8932ebe6"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_edd714311619a5ad09525045838"`);
        await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_69828a178f152f157dcf2f70a89"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "shippingAddress" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "status" character varying(50) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "orderId"`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD "orderId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "assignedToId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "wilayaId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isDelayed"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "trackingNumber"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."orders_source_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "rating"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "totalPrice"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "phoneNumber"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerName"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "totalAmount" numeric(10,2) NOT NULL`);
        await queryRunner.query(`DROP TABLE "order_history"`);
        await queryRunner.query(`DROP TABLE "wilayas"`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_user" ON "orders" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_items_product" ON "order_items" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_items_order" ON "order_items" ("orderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_products_isActive" ON "products" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products" ("categoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cart_items_product" ON "cart_items" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cart_items_cart" ON "cart_items" ("cartId") `);
        await queryRunner.query(`CREATE INDEX "IDX_carts_user" ON "carts" ("userId") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_cart" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carts" ADD CONSTRAINT "FK_carts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
