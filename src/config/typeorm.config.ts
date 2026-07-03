import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const buildTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 3306),
  username: config.get<string>('DB_USERNAME', 'root'),
  password: config.get<string>('DB_PASSWORD', ''),
  database: config.get<string>('DB_NAME', 'linguere'),
  entities: [], // on ajoutera les entités au fur et à mesure
  synchronize: true, // crée/modifie les tables automatiquement (dev seulement !)
  logging: true, // affiche les requêtes SQL dans la console (pratique pour apprendre)
});