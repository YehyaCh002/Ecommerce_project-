import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePotentialDuplicateColumn1777003000000 implements MigrationInterface {
  name = 'EnsurePotentialDuplicateColumn1777003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'orders'
            AND column_name = 'ispotentialduplicate'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'orders'
            AND column_name = 'isPotentialDuplicate'
        ) THEN
          ALTER TABLE "orders" RENAME COLUMN ispotentialduplicate TO "isPotentialDuplicate";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "isPotentialDuplicate" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "isPotentialDuplicate"
    `);
  }
}
