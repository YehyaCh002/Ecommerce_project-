import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddProductVariants1775140000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create product_variants table
    await queryRunner.createTable(
      new Table({
        name: 'product_variants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'productId',
            type: 'uuid',
          },
          {
            name: 'size',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'stock',
            type: 'integer',
            default: 0,
          },
          {
            name: 'priceOverride',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // 2. Add Foreign Key for productId in product_variants
    await queryRunner.createForeignKey(
      'product_variants',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      })
    );

    // 3. Add variantId to order_items
    await queryRunner.query(`ALTER TABLE "order_items" ADD COLUMN "variantId" uuid`);
    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['variantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'product_variants',
        onDelete: 'SET NULL',
      })
    );

    // 4. Add variantId to cart_items
    await queryRunner.query(`ALTER TABLE "cart_items" ADD COLUMN "variantId" uuid`);
    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['variantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'product_variants',
        onDelete: 'CASCADE',
      })
    );

    // 5. Create Indexes
    await queryRunner.createIndex('product_variants', new TableIndex({ columnNames: ['productId'] }));
    await queryRunner.createIndex('order_items', new TableIndex({ columnNames: ['variantId'] }));
    await queryRunner.createIndex('cart_items', new TableIndex({ columnNames: ['variantId'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Foreign Keys
    const orderItemsTable = await queryRunner.getTable('order_items');
    const cartItemsTable = await queryRunner.getTable('cart_items');
    
    if (orderItemsTable) {
      const foreignKey = orderItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('variantId') !== -1);
      if (foreignKey) await queryRunner.dropForeignKey('order_items', foreignKey);
    }
    
    if (cartItemsTable) {
      const foreignKey = cartItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('variantId') !== -1);
      if (foreignKey) await queryRunner.dropForeignKey('cart_items', foreignKey);
    }

    await queryRunner.dropColumn('cart_items', 'variantId');
    await queryRunner.dropColumn('order_items', 'variantId');
    await queryRunner.dropTable('product_variants');
  }
}
