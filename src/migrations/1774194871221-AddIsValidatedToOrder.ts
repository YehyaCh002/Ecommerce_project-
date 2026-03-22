import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsValidatedToOrder1774194871221 implements MigrationInterface {
    name = 'AddIsValidatedToOrder1774194871221'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f515690c571a03400a9876600b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5a27845bc2d79be6f1fa3d2c03"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_516736b9807228bb17b2d0a3e2"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "isValidated" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "action"`);
        await queryRunner.query(`CREATE TYPE "public"."order_history_action_enum" AS ENUM('Créé', 'Statut Mis à Jour', 'Imprimé', 'En Préparation', 'Expédié', 'Vers Wilaya', 'Reçu à Wilaya', 'Message Envoyé', 'Transfert', 'Annulé', 'Livraison Assignée', 'Échange')`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "action" "public"."order_history_action_enum" NOT NULL DEFAULT 'Créé'`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."order_history_status_enum" AS ENUM('En attente', 'Non répondu - 1ère tentative', 'Confirmé', 'OTP Confirmé', 'Vers la Wilaya', 'Reçu à la Wilaya', 'Livré', 'Annulé', 'Commande Fictive')`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "status" "public"."order_history_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryType"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_deliverytype_enum" AS ENUM('Domicile', 'Bureau', 'Yalidine Desk', 'Stop Desk')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryType" "public"."orders_deliverytype_enum" DEFAULT 'Domicile'`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "soldFromStore" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "soldFromStore" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryType"`);
        await queryRunner.query(`DROP TYPE "public"."orders_deliverytype_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryType" character varying(50) DEFAULT 'Domicile'`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."order_history_status_enum"`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "status" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "order_history" DROP COLUMN "action"`);
        await queryRunner.query(`DROP TYPE "public"."order_history_action_enum"`);
        await queryRunner.query(`ALTER TABLE "order_history" ADD "action" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isValidated"`);
        await queryRunner.query(`CREATE INDEX "IDX_516736b9807228bb17b2d0a3e2" ON "order_items" ("variantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5a27845bc2d79be6f1fa3d2c03" ON "cart_items" ("variantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f515690c571a03400a9876600b" ON "product_variants" ("productId") `);
    }

}
