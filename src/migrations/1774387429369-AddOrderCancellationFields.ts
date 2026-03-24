import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderCancellationFields1774387429369 implements MigrationInterface {
    name = 'AddOrderCancellationFields1774387429369'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_cancellationstatus_enum" AS ENUM('none', 'requested', 'confirmed')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "cancellationStatus" "public"."orders_cancellationstatus_enum" NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "cancellationReason" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "cancellationReason"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "cancellationStatus"`);
        await queryRunner.query(`DROP TYPE "public"."orders_cancellationstatus_enum"`);
    }
}
