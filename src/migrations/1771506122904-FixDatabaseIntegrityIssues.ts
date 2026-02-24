import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDatabaseIntegrityIssues1771506122904 implements MigrationInterface {
    name = 'FixDatabaseIntegrityIssues1771506122904'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // =====================================================================
        // 1. FIX TABLE NAME TYPO: "categoties" → "categories"
        // =====================================================================
        const typoTableExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'categoties'
        `);

        if (typoTableExists.length > 0) {
            const correctTableExists = await queryRunner.query(`
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'categories'
            `);

            if (correctTableExists.length > 0) {
                // Both tables exist — migrate unique rows from typo table, then drop it
                await queryRunner.query(`
                    INSERT INTO "categories" ("id", "name", "description", "slug", "createdAt", "updatedAt")
                    SELECT "id", "name", "description", "slug", "createdAt", "updatedAt"
                    FROM "categoties"
                    WHERE "name" NOT IN (SELECT "name" FROM "categories")
                    ON CONFLICT ("name") DO NOTHING
                `);

                // Re-point products referencing old IDs from the typo table
                await queryRunner.query(`
                    UPDATE "products" p
                    SET "categoryId" = c."id"
                    FROM "categories" c
                    JOIN "categoties" ct ON ct."name" = c."name"
                    WHERE p."categoryId" = ct."id"
                      AND p."categoryId" != c."id"
                `);

                await queryRunner.query(`DROP TABLE "categoties" CASCADE`);
            } else {
                // Only typo table exists — rename it
                await queryRunner.query(`ALTER TABLE "categoties" RENAME TO "categories"`);
            }
        }

        // =====================================================================
        // 2. REMOVE DUPLICATE CATEGORIES (keep earliest per unique name)
        // =====================================================================
        // Find keeper IDs (first inserted per name)
        await queryRunner.query(`
            CREATE TEMP TABLE _category_keepers AS
            SELECT DISTINCT ON ("name") "id", "name"
            FROM "categories"
            ORDER BY "name", "createdAt" ASC
        `);

        // Re-point products to the keeper before deleting duplicates
        await queryRunner.query(`
            UPDATE "products" p
            SET "categoryId" = ck."id"
            FROM "categories" c
            JOIN _category_keepers ck ON ck."name" = c."name"
            WHERE p."categoryId" = c."id"
              AND c."id" != ck."id"
        `);

        // Delete all duplicate rows (keeping only the keepers)
        await queryRunner.query(`
            DELETE FROM "categories"
            WHERE "id" NOT IN (SELECT "id" FROM _category_keepers)
        `);

        await queryRunner.query(`DROP TABLE _category_keepers`);

        // Ensure unique constraint on name (idempotent)
        const uniqueConstraintExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint
            WHERE conrelid = '"categories"'::regclass
              AND contype = 'u'
        `);
        if (uniqueConstraintExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "categories"
                ADD CONSTRAINT "UQ_categories_name" UNIQUE ("name")
            `);
        }

        // =====================================================================
        // 3. FIX UUID COLUMNS — remove/fix rows with invalid UUIDs
        //    Valid UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        // =====================================================================
        const UUID_REGEX = `'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`;

        // -- 3a. users.id — rows with invalid UUID PKs would break everything
        //        We delete them (cascade will clean up carts, orders, etc.)
        await queryRunner.query(`
            DELETE FROM "users"
            WHERE "id"::text !~ ${UUID_REGEX}
        `);

        // -- 3b. categories.id
        await queryRunner.query(`
            DELETE FROM "categories"
            WHERE "id"::text !~ ${UUID_REGEX}
        `);

        // -- 3c. products.id
        await queryRunner.query(`
            DELETE FROM "products"
            WHERE "id"::text !~ ${UUID_REGEX}
        `);

        // -- 3d. products.categoryId — nullify invalid FK references
        await queryRunner.query(`
            UPDATE "products"
            SET "categoryId" = NULL
            WHERE "categoryId" IS NOT NULL
              AND "categoryId"::text !~ ${UUID_REGEX}
        `);

        // -- 3e. carts.id
        await queryRunner.query(`
            DELETE FROM "carts"
            WHERE "id"::text !~ ${UUID_REGEX}
        `);

        // -- 3f. carts.userId — will be handled in step 4 (FK fix), but clean bad UUIDs first
        await queryRunner.query(`
            DELETE FROM "carts"
            WHERE "userId"::text !~ ${UUID_REGEX}
        `);

        // -- 3g. cart_items.id, cartId, productId
        await queryRunner.query(`
            DELETE FROM "cart_items"
            WHERE "id"::text !~ ${UUID_REGEX}
               OR "cartId"::text !~ ${UUID_REGEX}
               OR "productId"::text !~ ${UUID_REGEX}
        `);

        // -- 3h. order_items.id, productId
        await queryRunner.query(`
            DELETE FROM "order_items"
            WHERE "id"::text !~ ${UUID_REGEX}
               OR "productId"::text !~ ${UUID_REGEX}
        `);

        // -- 3i. orders.userId — nullify invalid UUID (column is nullable)
        await queryRunner.query(`
            UPDATE "orders"
            SET "userId" = NULL
            WHERE "userId" IS NOT NULL
              AND "userId"::text !~ ${UUID_REGEX}
        `);

        // -- 3j. orders.assignedToId — nullify invalid UUID
        await queryRunner.query(`
            UPDATE "orders"
            SET "assignedToId" = NULL
            WHERE "assignedToId" IS NOT NULL
              AND "assignedToId"::text !~ ${UUID_REGEX}
        `);

        // -- 3k. order_history.changedByUserId — nullify invalid UUID
        await queryRunner.query(`
            UPDATE "order_history"
            SET "changedByUserId" = NULL
            WHERE "changedByUserId" IS NOT NULL
              AND "changedByUserId"::text !~ ${UUID_REGEX}
        `);

        // =====================================================================
        // 4. FIX FOREIGN KEY VIOLATIONS IN "carts"
        //    Delete carts whose userId does not exist in users
        // =====================================================================

        // First remove orphaned cart_items whose cart will be deleted
        await queryRunner.query(`
            DELETE FROM "cart_items"
            WHERE "cartId" IN (
                SELECT c."id" FROM "carts" c
                LEFT JOIN "users" u ON c."userId" = u."id"
                WHERE u."id" IS NULL
            )
        `);

        // Now remove carts with non-existent userId
        await queryRunner.query(`
            DELETE FROM "carts" c
            USING (
                SELECT c2."id"
                FROM "carts" c2
                LEFT JOIN "users" u ON c2."userId" = u."id"
                WHERE u."id" IS NULL
            ) orphans
            WHERE c."id" = orphans."id"
        `);

        // Also fix orphaned cart_items referencing non-existent products
        await queryRunner.query(`
            DELETE FROM "cart_items"
            WHERE "productId" NOT IN (SELECT "id" FROM "products")
        `);

        // Also fix orphaned cart_items referencing non-existent carts
        await queryRunner.query(`
            DELETE FROM "cart_items"
            WHERE "cartId" NOT IN (SELECT "id" FROM "carts")
        `);

        // Fix orders referencing non-existent users (nullify, column is nullable)
        await queryRunner.query(`
            UPDATE "orders"
            SET "userId" = NULL
            WHERE "userId" IS NOT NULL
              AND "userId" NOT IN (SELECT "id" FROM "users")
        `);

        // Fix orders referencing non-existent assignedTo users
        await queryRunner.query(`
            UPDATE "orders"
            SET "assignedToId" = NULL
            WHERE "assignedToId" IS NOT NULL
              AND "assignedToId" NOT IN (SELECT "id" FROM "users")
        `);

        // Fix order_items referencing non-existent products (nullify)
        await queryRunner.query(`
            UPDATE "order_items"
            SET "productId" = NULL
            WHERE "productId" IS NOT NULL
              AND "productId" NOT IN (SELECT "id" FROM "products")
        `);

        // Fix order_history referencing non-existent users
        await queryRunner.query(`
            UPDATE "order_history"
            SET "changedByUserId" = NULL
            WHERE "changedByUserId" IS NOT NULL
              AND "changedByUserId" NOT IN (SELECT "id" FROM "users")
        `);

        // Fix products referencing non-existent categories
        await queryRunner.query(`
            UPDATE "products"
            SET "categoryId" = NULL
            WHERE "categoryId" IS NOT NULL
              AND "categoryId" NOT IN (SELECT "id" FROM "categories")
        `);

        // =====================================================================
        // 5. ADD MISSING NOT NULL COLUMNS SAFELY (with defaults)
        //    Handles cases where columns were added without proper defaults
        // =====================================================================

        // -- 5a. orders.customerName — add if missing, backfill, set NOT NULL
        const customerNameCol = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'customerName'
        `);
        if (customerNameCol.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "orders" ADD "customerName" character varying(255)
            `);
            // Backfill from linked user name when possible
            await queryRunner.query(`
                UPDATE "orders" o
                SET "customerName" = u."name"
                FROM "users" u
                WHERE o."userId" = u."id"
                  AND o."customerName" IS NULL
            `);
            // Default for any remaining NULLs
            await queryRunner.query(`
                UPDATE "orders"
                SET "customerName" = 'Unknown Customer'
                WHERE "customerName" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "customerName" SET NOT NULL
            `);
        } else {
            // Column exists but may have NULLs — backfill then enforce
            await queryRunner.query(`
                UPDATE "orders" o
                SET "customerName" = u."name"
                FROM "users" u
                WHERE o."userId" = u."id"
                  AND o."customerName" IS NULL
            `);
            await queryRunner.query(`
                UPDATE "orders"
                SET "customerName" = 'Unknown Customer'
                WHERE "customerName" IS NULL
            `);
            // Make NOT NULL if not already
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "customerName" SET NOT NULL
            `);
        }

        // -- 5b. orders.phoneNumber — add if missing, backfill, set NOT NULL
        const phoneCol = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'phoneNumber'
        `);
        if (phoneCol.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "orders" ADD "phoneNumber" character varying(50)
            `);
            await queryRunner.query(`
                UPDATE "orders"
                SET "phoneNumber" = '0000000000'
                WHERE "phoneNumber" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "phoneNumber" SET NOT NULL
            `);
        } else {
            await queryRunner.query(`
                UPDATE "orders"
                SET "phoneNumber" = '0000000000'
                WHERE "phoneNumber" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "phoneNumber" SET NOT NULL
            `);
        }

        // -- 5c. orders.totalPrice — ensure NOT NULL with default 0
        const totalPriceCol = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'totalPrice'
        `);
        if (totalPriceCol.length > 0) {
            await queryRunner.query(`
                UPDATE "orders"
                SET "totalPrice" = 0
                WHERE "totalPrice" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "totalPrice" SET NOT NULL
            `);
        }

        // -- 5d. orders.status — ensure NOT NULL with default
        const statusCol = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'status'
        `);
        if (statusCol.length > 0) {
            await queryRunner.query(`
                UPDATE "orders"
                SET "status" = 'En attente'
                WHERE "status" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "status" SET NOT NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'En attente'
            `);
        }

        // -- 5e. orders.source — ensure NOT NULL with default
        const sourceCol = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'source'
        `);
        if (sourceCol.length > 0) {
            await queryRunner.query(`
                UPDATE "orders"
                SET "source" = 'Other'
                WHERE "source" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "source" SET NOT NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "source" SET DEFAULT 'Other'
            `);
        }

        // -- 5f. orders.isDelayed — ensure NOT NULL with default false
        const isDelayedCol = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'isDelayed'
        `);
        if (isDelayedCol.length > 0) {
            await queryRunner.query(`
                UPDATE "orders"
                SET "isDelayed" = false
                WHERE "isDelayed" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "isDelayed" SET NOT NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "orders" ALTER COLUMN "isDelayed" SET DEFAULT false
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // This migration fixes data integrity issues.
        // The "down" makes columns nullable again but cannot restore deleted bad data.
        // Reverting corrupted/orphaned data is not meaningful.

        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "isDelayed" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "source" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "totalPrice" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "phoneNumber" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "customerName" DROP NOT NULL`);
    }
}
