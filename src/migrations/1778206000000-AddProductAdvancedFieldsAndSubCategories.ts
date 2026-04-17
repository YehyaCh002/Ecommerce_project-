import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductAdvancedFieldsAndSubCategories1778206000000
  implements MigrationInterface
{
  name = 'AddProductAdvancedFieldsAndSubCategories1778206000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "parentCategoryId" integer
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_categories_parentCategoryId" ON "categories" ("parentCategoryId")`
    );

    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_categories_parent_category"
      FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "costPrice" numeric(10,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "subCategoryId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "isLandingPageProduct" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "deductStockOnConfirmation" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_subCategoryId" ON "products" ("subCategoryId")`
    );

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_sub_category"
      FOREIGN KEY ("subCategoryId") REFERENCES "categories"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "imageUrl" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "imageUrl"`
    );

    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_sub_category"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_subCategoryId"`
    );

    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "deductStockOnConfirmation"`
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "isLandingPageProduct"`
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "subCategoryId"`
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "costPrice"`
    );

    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_categories_parent_category"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_categories_parentCategoryId"`
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "parentCategoryId"`
    );
  }
}
