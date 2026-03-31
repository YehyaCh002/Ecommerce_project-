import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrackingSystem1774966572305 implements MigrationInterface {
    name = 'AddTrackingSystem1774966572305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tracking_logs" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "status" character varying(100) NOT NULL, "sub_status" character varying(100), "description" text, "location" character varying(255), "actor" character varying(255), "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1d999c9178c7474933d3a2e43ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_00c76140a1ad4231603a5aa726" ON "tracking_logs" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_a3f08bfca1ecbccb4163f5e39f" ON "tracking_logs" ("orderId") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD "tracking_status" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "current_sub_status" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "last_status_change_at" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_a19daec397a82a9aaf36a8d9b6" ON "orders" ("last_status_change_at") `);
        await queryRunner.query(`ALTER TABLE "tracking_logs" ADD CONSTRAINT "FK_a3f08bfca1ecbccb4163f5e39f3" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracking_logs" DROP CONSTRAINT "FK_a3f08bfca1ecbccb4163f5e39f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a19daec397a82a9aaf36a8d9b6"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "last_status_change_at"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "current_sub_status"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tracking_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3f08bfca1ecbccb4163f5e39f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_00c76140a1ad4231603a5aa726"`);
        await queryRunner.query(`DROP TABLE "tracking_logs"`);
    }

}
