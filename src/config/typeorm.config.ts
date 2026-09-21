import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const buildTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  // `synchronize` ne doit jamais tourner en dehors des tests (CI, base
  // jetable) : en dev/prod le schema evolue exclusivement via des
  // migrations versionnees (voir src/config/data-source.ts et
  // `npm run migration:*`), sans quoi une modification d'entite pourrait
  // alterer/perdre des donnees en production au prochain demarrage.
  const isTest = nodeEnv === 'test';

  return {
    type: 'mysql',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get<string>('DB_USERNAME', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_NAME', 'linguere'),
    ssl:
      config.get<string>('DB_SSL_MODE') === 'REQUIRED'
        ? {
            rejectUnauthorized:
              config.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'false') ===
              'true',
          }
        : undefined,
    autoLoadEntities: true,
    synchronize: isTest,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: !isTest,
    logging: nodeEnv !== 'production',
  };
};
