import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailAndDetailedAddressToOrder1775138123456 implements MigrationInterface {
    name = 'AddEmailAndDetailedAddressToOrder1775138123456'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "customerEmail" varchar(255)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "detailedAddress" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "detailedAddress"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerEmail"`);
    }

}
