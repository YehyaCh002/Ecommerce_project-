import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenToUser1779289668105 implements MigrationInterface {
    name = 'AddRefreshTokenToUser1779289668105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_parent_category"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_sub_category"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_product"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "FK_vendor_return_scans_user"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "FK_vendor_return_scans_order"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "FK_vendor_return_scans_batch"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" DROP CONSTRAINT "FK_vendor_return_batches_closed_by_user"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" DROP CONSTRAINT "FK_vendor_return_batches_created_by_user"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" DROP CONSTRAINT "FK_vendor_return_batches_delivery_platform"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_categories_parentCategoryId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_products_subCategoryId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_stock_movements_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_stock_movements_product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_stock_movements_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_vendor_return_scans_batchId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_vendor_return_scans_trackingNumber"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_vendor_return_batches_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_vendor_return_batches_status"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "UQ_vendor_return_scans_batch_tracking"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" text`);
        await queryRunner.query(`CREATE INDEX "IDX_ccde635bce518afe7c110858cc" ON "categories" ("parentCategoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad42985fb27aa9016b16ee740e" ON "products" ("subCategoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f38d3033b7f70b32431f84c8b8" ON "stock_movements" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_cca7634960c09010c40b6490a1" ON "stock_movements" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_a3acb59db67e977be45e382fc5" ON "stock_movements" ("productId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_92424841b408e8794158fc89e2" ON "vendor_return_scans" ("batchId", "trackingNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_dbb7d1f63a3115ce3e15259dd6" ON "vendor_return_scans" ("trackingNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_43bfda91d3f64d2d14bd7d6b33" ON "vendor_return_scans" ("batchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dbd7b5fe3d68987ebdbeaab963" ON "vendor_return_batches" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_855690a6760345689f15ce09ee" ON "vendor_return_batches" ("createdAt") `);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_ccde635bce518afe7c110858cc4" FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ad42985fb27aa9016b16ee740ec" FOREIGN KEY ("subCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_a3acb59db67e977be45e382fc56" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_43bfda91d3f64d2d14bd7d6b33d" FOREIGN KEY ("batchId") REFERENCES "vendor_return_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_834fca69f6d3324615289c8501f" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_ed613daf8584ccaca191c5d3298" FOREIGN KEY ("scannedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_5b78119f73b5ff4319baa2ffb7f" FOREIGN KEY ("deliveryPlatformId") REFERENCES "delivery_platforms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_74f2241a77c99c7bf31716a5e14" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_0c2f97c9b48f34bd38c21d28eaa" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" DROP CONSTRAINT "FK_0c2f97c9b48f34bd38c21d28eaa"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" DROP CONSTRAINT "FK_74f2241a77c99c7bf31716a5e14"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" DROP CONSTRAINT "FK_5b78119f73b5ff4319baa2ffb7f"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "FK_ed613daf8584ccaca191c5d3298"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "FK_834fca69f6d3324615289c8501f"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" DROP CONSTRAINT "FK_43bfda91d3f64d2d14bd7d6b33d"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_a3acb59db67e977be45e382fc56"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ad42985fb27aa9016b16ee740ec"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_ccde635bce518afe7c110858cc4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_855690a6760345689f15ce09ee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dbd7b5fe3d68987ebdbeaab963"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43bfda91d3f64d2d14bd7d6b33"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dbb7d1f63a3115ce3e15259dd6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92424841b408e8794158fc89e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3acb59db67e977be45e382fc5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cca7634960c09010c40b6490a1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f38d3033b7f70b32431f84c8b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad42985fb27aa9016b16ee740e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ccde635bce518afe7c110858cc"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "UQ_vendor_return_scans_batch_tracking" UNIQUE ("batchId", "trackingNumber")`);
        await queryRunner.query(`CREATE INDEX "IDX_vendor_return_batches_status" ON "vendor_return_batches" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_vendor_return_batches_createdAt" ON "vendor_return_batches" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_vendor_return_scans_trackingNumber" ON "vendor_return_scans" ("trackingNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_vendor_return_scans_batchId" ON "vendor_return_scans" ("batchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_stock_movements_created" ON "stock_movements" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_stock_movements_product" ON "stock_movements" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_stock_movements_type" ON "stock_movements" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_products_subCategoryId" ON "products" ("subCategoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_categories_parentCategoryId" ON "categories" ("parentCategoryId") `);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_vendor_return_batches_delivery_platform" FOREIGN KEY ("deliveryPlatformId") REFERENCES "delivery_platforms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_vendor_return_batches_created_by_user" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_batches" ADD CONSTRAINT "FK_vendor_return_batches_closed_by_user" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_vendor_return_scans_batch" FOREIGN KEY ("batchId") REFERENCES "vendor_return_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_vendor_return_scans_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_return_scans" ADD CONSTRAINT "FK_vendor_return_scans_user" FOREIGN KEY ("scannedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_sub_category" FOREIGN KEY ("subCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_parent_category" FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
