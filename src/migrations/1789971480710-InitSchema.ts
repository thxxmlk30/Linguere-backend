import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1789971480710 implements MigrationInterface {
  name = 'InitSchema1789971480710';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`delivery_zones\` (\`id\` varchar(255) NOT NULL, \`department\` varchar(255) NOT NULL, \`commune\` varchar(255) NOT NULL, \`sector\` varchar(255) NOT NULL, \`description\` text NULL, \`fee\` decimal(10,2) NOT NULL DEFAULT '0.00', \`etaMinutes\` int NOT NULL DEFAULT '0', \`lat\` float NOT NULL, \`lng\` float NOT NULL, \`mapX\` float NOT NULL, \`mapY\` float NOT NULL, \`landmarks\` text NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`ingredients\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`currentStock\` float NOT NULL DEFAULT '0', \`unit\` enum ('kg', 'l', 'unit', 'g') NOT NULL DEFAULT 'unit', \`minStock\` float NOT NULL DEFAULT '0', \`reorderThreshold\` float NOT NULL DEFAULT '0', \`criticalStock\` float NOT NULL DEFAULT '0', \`supplier\` varchar(255) NULL, \`costPerUnit\` decimal(10,2) NULL, \`lastRestockedAt\` datetime NULL, \`lastCountedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`menu_items\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`price\` decimal(10,2) NOT NULL, \`category\` enum ('entree', 'plat', 'dessert', 'boisson') NOT NULL, \`available\` tinyint NOT NULL DEFAULT 1, \`image\` text NULL, \`meal\` varchar(255) NOT NULL DEFAULT 'any', \`prepTimeMinutes\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`menu_item_ingredients\` (\`id\` varchar(36) NOT NULL, \`menuItemId\` varchar(255) NOT NULL, \`ingredientId\` varchar(255) NOT NULL, \`quantityRequired\` float NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`fullName\` varchar(255) NOT NULL, \`password\` varchar(255) NULL, \`role\` enum ('admin', 'client') NOT NULL DEFAULT 'client', \`provider\` enum ('local', 'google') NOT NULL DEFAULT 'local', \`providerId\` varchar(255) NULL, \`isEmailVerified\` tinyint NOT NULL DEFAULT 0, \`otpCode\` varchar(255) NULL, \`otpExpiresAt\` timestamp NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`orders\` (\`id\` varchar(36) NOT NULL, \`userId\` varchar(255) NOT NULL, \`serviceType\` enum ('dine_in', 'delivery') NOT NULL DEFAULT 'dine_in', \`tableNumber\` int NULL, \`deliveryZoneId\` varchar(255) NULL, \`deliveryAddress\` text NULL, \`deliveryNotes\` text NULL, \`deliveryFee\` decimal(10,2) NOT NULL DEFAULT '0.00', \`subtotalAmount\` decimal(10,2) NOT NULL DEFAULT '0.00', \`customerName\` varchar(255) NULL, \`customerPhone\` varchar(255) NULL, \`assignedChefId\` varchar(255) NULL, \`assignedChefName\` varchar(255) NULL, \`courierId\` varchar(255) NULL, \`courierName\` varchar(255) NULL, \`totalAmount\` decimal(10,2) NOT NULL, \`paymentStatus\` enum ('unpaid', 'pending', 'paid', 'failed') NOT NULL DEFAULT 'unpaid', \`paymentProvider\` varchar(255) NULL, \`paymentSessionId\` varchar(255) NULL, \`paymentIntentId\` varchar(255) NULL, \`paidAt\` datetime NULL, \`rating\` int NULL, \`review\` text NULL, \`ratedAt\` datetime NULL, \`status\` enum ('pending', 'preparing', 'ready', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`order_items\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`menuItemId\` varchar(255) NOT NULL, \`quantity\` int NOT NULL, \`unitPrice\` decimal(10,2) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`staff\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`role\` enum ('admin', 'waiter', 'chef', 'delivery') NOT NULL DEFAULT 'waiter', \`phone\` varchar(255) NOT NULL, \`salary\` decimal(12,2) NULL, \`hireDate\` date NULL, \`shift\` varchar(255) NULL, \`zone\` varchar(255) NULL, \`status\` enum ('active', 'break', 'off') NOT NULL DEFAULT 'active', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_902985a964245652d5e3a0f5f6\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`menu_item_ingredients\` ADD CONSTRAINT \`FK_3317a0c7c97a6d4dcd1dfdfef16\` FOREIGN KEY (\`menuItemId\`) REFERENCES \`menu_items\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`menu_item_ingredients\` ADD CONSTRAINT \`FK_864b3a65394c7035d2e3a930731\` FOREIGN KEY (\`ingredientId\`) REFERENCES \`ingredients\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_151b79a83ba240b0cb31b2302d1\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_f1d359a55923bb45b057fbdab0d\` FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_d8453d5a71e525d9b406c35aab8\` FOREIGN KEY (\`menuItemId\`) REFERENCES \`menu_items\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_d8453d5a71e525d9b406c35aab8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_f1d359a55923bb45b057fbdab0d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_151b79a83ba240b0cb31b2302d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`menu_item_ingredients\` DROP FOREIGN KEY \`FK_864b3a65394c7035d2e3a930731\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`menu_item_ingredients\` DROP FOREIGN KEY \`FK_3317a0c7c97a6d4dcd1dfdfef16\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_902985a964245652d5e3a0f5f6\` ON \`staff\``,
    );
    await queryRunner.query(`DROP TABLE \`staff\``);
    await queryRunner.query(`DROP TABLE \`order_items\``);
    await queryRunner.query(`DROP TABLE \`orders\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`menu_item_ingredients\``);
    await queryRunner.query(`DROP TABLE \`menu_items\``);
    await queryRunner.query(`DROP TABLE \`ingredients\``);
    await queryRunner.query(`DROP TABLE \`delivery_zones\``);
  }
}
