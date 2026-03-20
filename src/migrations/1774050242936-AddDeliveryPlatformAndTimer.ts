import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryPlatformAndTimer1774050242936 implements MigrationInterface {
    name = 'AddDeliveryPlatformAndTimer1774050242936'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "delivery_platforms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "apiKey" character varying(255), "apiSecret" character varying(255), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_039c70e736c21d586272bd50a96" UNIQUE ("name"), CONSTRAINT "PK_3fabf5af0acca4313978d0f7916" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryPlatformId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_23fdf30c3994ef48cabdf748d0f" FOREIGN KEY ("deliveryPlatformId") REFERENCES "delivery_platforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_23fdf30c3994ef48cabdf748d0f"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryPlatformId"`);
        await queryRunner.query(`DROP TABLE "delivery_platforms"`);
    }

}
