import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderValidationOutcome1776001000000 implements MigrationInterface {
  name = 'AddOrderValidationOutcome1776001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_validationoutcome_enum" AS ENUM('received', 'returned', 'exchanged', 'refused', 'unreachable', 'other')`
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "validationOutcome" "public"."orders_validationoutcome_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "validatedAt" TIMESTAMP`
    );

    await queryRunner.query(
      `UPDATE "orders" SET "validationOutcome" = 'received', "validatedAt" = NOW() WHERE "isValidated" = true`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "validatedAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "validationOutcome"`);
    await queryRunner.query(`DROP TYPE "public"."orders_validationoutcome_enum"`);
  }
}
