import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertUserIdToUuid1777000000000 implements MigrationInterface {
  name = 'ConvertUserIdToUuid1777000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Ensure uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2) Create mapping table and populate with new uuids
    await queryRunner.query(`
      CREATE TABLE user_uuid_map (
        old_id BIGINT PRIMARY KEY,
        new_uuid UUID NOT NULL
      );
    `);

    await queryRunner.query(`
      INSERT INTO user_uuid_map (old_id, new_uuid)
      SELECT id::bigint, uuid_generate_v4() FROM users ORDER BY id;
    `);

    // 3) Create new users table with uuid PK
    await queryRunner.query(`
      CREATE TABLE users_new (
        id UUID PRIMARY KEY,
        name character varying(255) NOT NULL,
        email character varying(255) NOT NULL,
        password character varying(255) NOT NULL,
        role character varying(50) NOT NULL DEFAULT 'customer',
        avatar character varying(500),
        "refreshToken" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // 4) Copy users data using mapping — handle optional columns (e.g. refreshToken) safely
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'refreshToken'
        ) THEN
          EXECUTE $sql$
            INSERT INTO users_new (id, name, email, password, role, avatar, "refreshToken", "createdAt", "updatedAt")
            SELECT m.new_uuid, u.name, u.email, u.password, u.role, u.avatar, u."refreshToken", u."createdAt", u."updatedAt"
            FROM users u
            JOIN user_uuid_map m ON u.id::bigint = m.old_id
            ORDER BY m.old_id;
          $sql$;
        ELSE
          EXECUTE $sql$
            INSERT INTO users_new (id, name, email, password, role, avatar, "createdAt", "updatedAt")
            SELECT m.new_uuid, u.name, u.email, u.password, u.role, u.avatar, u."createdAt", u."updatedAt"
            FROM users u
            JOIN user_uuid_map m ON u.id::bigint = m.old_id
            ORDER BY m.old_id;
          $sql$;
        END IF;
      END
      $$;
    `);

    // 5) Update referencing tables: add temporary uuid columns and populate (only if the tables/columns exist)
    // carts.userId -> uuid
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carts') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carts' AND column_name = 'userId') THEN
            EXECUTE $sql$ ALTER TABLE carts ADD COLUMN "userId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE carts SET "userId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = carts."userId"::bigint); $sql$;
          END IF;
        END IF;
      END
      $$;
    `);

    // orders.userId and orders.assignedToId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'userId') THEN
            EXECUTE $sql$ ALTER TABLE orders ADD COLUMN "userId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE orders SET "userId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = orders."userId"::bigint); $sql$;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assignedToId') THEN
            EXECUTE $sql$ ALTER TABLE orders ADD COLUMN "assignedToId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE orders SET "assignedToId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = orders."assignedToId"::bigint); $sql$;
          END IF;
        END IF;
      END
      $$;
    `);

    // order_history.changedByUserId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_history') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_history' AND column_name = 'changedByUserId') THEN
            EXECUTE $sql$ ALTER TABLE order_history ADD COLUMN "changedByUserId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE order_history SET "changedByUserId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = order_history."changedByUserId"::bigint); $sql$;
          END IF;
        END IF;
      END
      $$;
    `);

    // vendor_return_batches createdByUserId, closedByUserId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_return_batches') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_return_batches' AND column_name = 'createdByUserId') THEN
            EXECUTE $sql$ ALTER TABLE vendor_return_batches ADD COLUMN "createdByUserId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE vendor_return_batches SET "createdByUserId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = vendor_return_batches."createdByUserId"::bigint); $sql$;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_return_batches' AND column_name = 'closedByUserId') THEN
            EXECUTE $sql$ ALTER TABLE vendor_return_batches ADD COLUMN "closedByUserId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE vendor_return_batches SET "closedByUserId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = vendor_return_batches."closedByUserId"::bigint); $sql$;
          END IF;
        END IF;
      END
      $$;
    `);

    // vendor_return_scans scannedByUserId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_return_scans') THEN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_return_scans' AND column_name = 'scannedByUserId') THEN
            EXECUTE $sql$ ALTER TABLE vendor_return_scans ADD COLUMN "scannedByUserId_uuid" UUID; $sql$;
            EXECUTE $sql$ UPDATE vendor_return_scans SET "scannedByUserId_uuid" = (SELECT new_uuid FROM user_uuid_map WHERE old_id = vendor_return_scans."scannedByUserId"::bigint); $sql$;
          END IF;
        END IF;
      END
      $$;
    `);

    // 6) Drop foreign key constraints referencing users (if exist) and old columns, then rename uuid columns
    // Note: we attempt to drop constraints by name patterns; constraints may differ per DB — adjust if necessary.

    // carts
    await queryRunner.query(`ALTER TABLE carts DROP CONSTRAINT IF EXISTS "FK_carts_user";`);
    await queryRunner.query(`ALTER TABLE carts DROP COLUMN "userId";`);
    await queryRunner.query(`ALTER TABLE carts RENAME COLUMN "userId_uuid" TO "userId";`);
    await queryRunner.query(`ALTER TABLE carts ADD CONSTRAINT "FK_carts_user" FOREIGN KEY ("userId") REFERENCES users_new(id) ON DELETE CASCADE;`);

    // orders: assignedToId may have FK, userId may or may not
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS "FK_orders_assignedTo";`);
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS "FK_orders_user";`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN "userId";`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN "assignedToId";`);
    await queryRunner.query(`ALTER TABLE orders RENAME COLUMN "userId_uuid" TO "userId";`);
    await queryRunner.query(`ALTER TABLE orders RENAME COLUMN "assignedToId_uuid" TO "assignedToId";`);
    await queryRunner.query(`ALTER TABLE orders ADD CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES users_new(id) ON DELETE SET NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD CONSTRAINT "FK_orders_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES users_new(id) ON DELETE SET NULL;`);

    // order_history
    await queryRunner.query(`ALTER TABLE order_history DROP CONSTRAINT IF EXISTS "FK_order_history_changedByUser";`);
    await queryRunner.query(`ALTER TABLE order_history DROP COLUMN "changedByUserId";`);
    await queryRunner.query(`ALTER TABLE order_history RENAME COLUMN "changedByUserId_uuid" TO "changedByUserId";`);
    await queryRunner.query(`ALTER TABLE order_history ADD CONSTRAINT "FK_order_history_changedByUser" FOREIGN KEY ("changedByUserId") REFERENCES users_new(id) ON DELETE SET NULL;`);

    // vendor_return_batches
    await queryRunner.query(`ALTER TABLE vendor_return_batches DROP CONSTRAINT IF EXISTS "FK_vendor_return_batches_createdBy";`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches DROP CONSTRAINT IF EXISTS "FK_vendor_return_batches_closedBy";`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches DROP COLUMN "createdByUserId";`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches DROP COLUMN "closedByUserId";`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches RENAME COLUMN "createdByUserId_uuid" TO "createdByUserId";`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches RENAME COLUMN "closedByUserId_uuid" TO "closedByUserId";`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches ADD CONSTRAINT "FK_vendor_return_batches_createdBy" FOREIGN KEY ("createdByUserId") REFERENCES users_new(id) ON DELETE SET NULL;`);
    await queryRunner.query(`ALTER TABLE vendor_return_batches ADD CONSTRAINT "FK_vendor_return_batches_closedBy" FOREIGN KEY ("closedByUserId") REFERENCES users_new(id) ON DELETE SET NULL;`);

    // vendor_return_scans
    await queryRunner.query(`ALTER TABLE vendor_return_scans DROP CONSTRAINT IF EXISTS "FK_vendor_return_scans_scannedBy";`);
    await queryRunner.query(`ALTER TABLE vendor_return_scans DROP COLUMN "scannedByUserId";`);
    await queryRunner.query(`ALTER TABLE vendor_return_scans RENAME COLUMN "scannedByUserId_uuid" TO "scannedByUserId";`);
    await queryRunner.query(`ALTER TABLE vendor_return_scans ADD CONSTRAINT "FK_vendor_return_scans_scannedBy" FOREIGN KEY ("scannedByUserId") REFERENCES users_new(id) ON DELETE SET NULL;`);

    // 7) Replace users table (only if source/target exist)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_new') THEN
          EXECUTE $sql$ DROP TABLE users CASCADE; $sql$;
          EXECUTE $sql$ ALTER TABLE users_new RENAME TO users; $sql$;
        END IF;
      END
      $$;
    `);

    // 8) Recreate primary key/sequence settings if needed (users.id is uuid PK already)

    // 9) Drop mapping table
    await queryRunner.query(`DROP TABLE user_uuid_map;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting this migration is complex and not implemented.
    throw new Error('Down migration not implemented for ConvertUserIdToUuid1777000000000');
  }
}
