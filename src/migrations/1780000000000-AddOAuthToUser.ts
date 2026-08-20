import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthToUser1780000000000 implements MigrationInterface {
  name = 'AddOAuthToUser1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make password nullable for OAuth-only users
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "password" DROP NOT NULL
    `);

    // Add oauth_provider column
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "oauth_provider" VARCHAR(50) NULL
    `);

    // Add oauth_id column
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "oauth_id" VARCHAR(255) NULL
    `);

    // Unique index so (provider, oauthId) pairs can be looked up fast
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_oauth_provider_id"
        ON "users" ("oauth_provider", "oauth_id")
        WHERE "oauth_provider" IS NOT NULL AND "oauth_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_oauth_provider_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "oauth_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "oauth_provider"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
  }
}
