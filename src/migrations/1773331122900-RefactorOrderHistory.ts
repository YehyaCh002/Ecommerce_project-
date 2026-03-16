import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorOrderHistory1773331122900 implements MigrationInterface {
    name = 'RefactorOrderHistory1773331122900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns
        await queryRunner.query(`ALTER TABLE "order_history" ADD "action" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "status" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "details" text`);

        // Migrate existing data (Legacy status updates)
        await queryRunner.query(`UPDATE "order_history" SET "action" = 'Status Update', "status" = "newStatus", "details" = "note"`);

        // Make action NOT NULL after migration
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" SET NOT NULL`);

        // Drop old columns
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "oldStatus"`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "newStatus"`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "note"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore old columns
        await queryRunner.query(`ALTER TABLE "order_history" ADD "note" text`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "newStatus" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "oldStatus" character varying(100)`);

        // Revert data
        await queryRunner.query(`UPDATE "order_history" SET "newStatus" = "status", "note" = "details"`);

        // Make newStatus NOT NULL
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "newStatus" SET NOT NULL`);

        // Drop new columns
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "details"`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "action"`);
    }

}
