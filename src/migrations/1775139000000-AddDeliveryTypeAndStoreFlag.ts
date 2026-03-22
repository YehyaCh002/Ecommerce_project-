import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryTypeAndStoreFlag1775139000000 implements MigrationInterface {
    name = 'AddDeliveryTypeAndStoreFlag1775139000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryType" varchar(50) DEFAULT 'Domicile'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "soldFromStore" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "soldFromStore"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryType"`);
    }

}
