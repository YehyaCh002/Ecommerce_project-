import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPotentialDuplicateAlert1774447382530 implements MigrationInterface {
    name = 'AddPotentialDuplicateAlert1774447382530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "isPotentialDuplicate" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TYPE "public"."order_history_action_enum" RENAME TO "order_history_action_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."order_history_action_enum" AS ENUM('Créé', 'Statut Mis à Jour', 'Imprimé', 'En Préparation', 'Expédié', 'Vers Wilaya', 'Reçu à Wilaya', 'Message Envoyé', 'Transfert', 'Annulé', 'Livraison Assignée', 'Échange', 'Doublon Potentiel DetectÃ©')`);
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" TYPE "public"."order_history_action_enum" USING "action"::"text"::"public"."order_history_action_enum"`);
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" SET DEFAULT 'Créé'`);
        await queryRunner.query(`DROP TYPE "public"."order_history_action_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."order_history_action_enum_old" AS ENUM('Créé', 'Statut Mis à Jour', 'Imprimé', 'En Préparation', 'Expédié', 'Vers Wilaya', 'Reçu à Wilaya', 'Message Envoyé', 'Transfert', 'Annulé', 'Livraison Assignée', 'Échange')`);
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" TYPE "public"."order_history_action_enum_old" USING "action"::"text"::"public"."order_history_action_enum_old"`);
        await queryRunner.query(`ALTER TABLE "order_history" ALTER COLUMN "action" SET DEFAULT 'Créé'`);
        await queryRunner.query(`DROP TYPE "public"."order_history_action_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."order_history_action_enum_old" RENAME TO "order_history_action_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isPotentialDuplicate"`);
    }

}
