import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualUpdateOrderExchangeAndShipping1775132845359 implements MigrationInterface {
    name = 'ManualUpdateOrderExchangeAndShipping1775132845359'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Renaming notes to remark to match the new UI fields
        // Since I already deleted 'notes' from the entity but it's still in the DB, I'll rename it.
        await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "notes" TO "remark"`);
        
        // Add new columns to orders
        await queryRunner.query(`ALTER TABLE "orders" ADD "internalComment" text`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingFee" numeric(10,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "isExchange" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "exchangePrice" numeric(10,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "productToCollect" text`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "isFreeShipping" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "hasInsurance" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverting columns from orders
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "hasInsurance"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isFreeShipping"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "productToCollect"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "exchangePrice"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isExchange"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingFee"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "internalComment"`);
        
        // Restoring remark back to notes
        await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "remark" TO "notes"`);
    }

}
