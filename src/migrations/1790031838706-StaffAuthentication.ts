import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffAuthentication1790031838706 implements MigrationInterface {
  name = 'StaffAuthentication1790031838706';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`staff\` ADD \`userId\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`staff\` ADD UNIQUE INDEX \`IDX_eba76c23bcfc9dad2479b7fd2a\` (\`userId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`role\` \`role\` enum ('admin', 'client', 'chef', 'waiter', 'delivery') NOT NULL DEFAULT 'client'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_eba76c23bcfc9dad2479b7fd2a\` ON \`staff\` (\`userId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`staff\` ADD CONSTRAINT \`FK_eba76c23bcfc9dad2479b7fd2ad\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`staff\` DROP FOREIGN KEY \`FK_eba76c23bcfc9dad2479b7fd2ad\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_eba76c23bcfc9dad2479b7fd2a\` ON \`staff\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`role\` \`role\` enum ('admin', 'client') NOT NULL DEFAULT 'client'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`staff\` DROP INDEX \`IDX_eba76c23bcfc9dad2479b7fd2a\``,
    );
    await queryRunner.query(`ALTER TABLE \`staff\` DROP COLUMN \`userId\``);
  }
}
