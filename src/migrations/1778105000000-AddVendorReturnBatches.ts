import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorReturnBatches1778105000000 implements MigrationInterface {
  name = 'AddVendorReturnBatches1778105000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."vendor_return_batches_status_enum" AS ENUM('open', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_return_batches" (
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
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_return_scans" (
        "id" SERIAL NOT NULL,
        "batchId" integer NOT NULL,
        "orderId" integer,
        "trackingNumber" character varying(100) NOT NULL,
        "scannedByUserId" uuid,
        "scannedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendor_return_scans_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vendor_return_scans_batch_tracking" UNIQUE ("batchId", "trackingNumber")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_return_batches_createdAt" ON "vendor_return_batches" ("createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_return_batches_status" ON "vendor_return_batches" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_return_scans_batchId" ON "vendor_return_scans" ("batchId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_return_scans_trackingNumber" ON "vendor_return_scans" ("trackingNumber")`
    );

    await queryRunner.query(`
      ALTER TABLE "vendor_return_batches"
      ADD CONSTRAINT "FK_vendor_return_batches_delivery_platform"
      FOREIGN KEY ("deliveryPlatformId") REFERENCES "delivery_platforms"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vendor_return_batches"
      ADD CONSTRAINT "FK_vendor_return_batches_created_by_user"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vendor_return_batches"
      ADD CONSTRAINT "FK_vendor_return_batches_closed_by_user"
      FOREIGN KEY ("closedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vendor_return_scans"
      ADD CONSTRAINT "FK_vendor_return_scans_batch"
      FOREIGN KEY ("batchId") REFERENCES "vendor_return_batches"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vendor_return_scans"
      ADD CONSTRAINT "FK_vendor_return_scans_order"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "vendor_return_scans"
      ADD CONSTRAINT "FK_vendor_return_scans_user"
      FOREIGN KEY ("scannedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vendor_return_scans" DROP CONSTRAINT IF EXISTS "FK_vendor_return_scans_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_return_scans" DROP CONSTRAINT IF EXISTS "FK_vendor_return_scans_order"`
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_return_scans" DROP CONSTRAINT IF EXISTS "FK_vendor_return_scans_batch"`
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_return_batches" DROP CONSTRAINT IF EXISTS "FK_vendor_return_batches_closed_by_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_return_batches" DROP CONSTRAINT IF EXISTS "FK_vendor_return_batches_created_by_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_return_batches" DROP CONSTRAINT IF EXISTS "FK_vendor_return_batches_delivery_platform"`
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vendor_return_scans_trackingNumber"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vendor_return_scans_batchId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vendor_return_batches_status"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vendor_return_batches_createdAt"`
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_return_scans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_return_batches"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."vendor_return_batches_status_enum"`
    );
  }
}
