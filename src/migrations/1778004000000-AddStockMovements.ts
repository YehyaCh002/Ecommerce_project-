import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockMovements1778004000000 implements MigrationInterface {
  name = 'AddStockMovements1778004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_movements" (
        "id" SERIAL NOT NULL,
        "productId" integer NOT NULL,
        "type" character varying(50) NOT NULL DEFAULT 'manual',
        "totalChanges" integer NOT NULL DEFAULT 0,
        "oldStock" integer NOT NULL,
        "newStock" integer NOT NULL,
        "details" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_product" ON "stock_movements" ("productId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_type" ON "stock_movements" ("type")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_created" ON "stock_movements" ("createdAt")`
    );

    await queryRunner.query(`
      ALTER TABLE "stock_movements"
      ADD CONSTRAINT "FK_stock_movements_product"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "FK_stock_movements_product"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_movements_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_movements_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_movements_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements"`);
  }
}
