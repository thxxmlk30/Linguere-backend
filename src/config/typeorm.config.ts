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
  ssl:
    config.get<string>('DB_SSL_MODE') === 'REQUIRED'
      ? {
          rejectUnauthorized:
            config.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'false') ===
            'true',
        }
      : undefined,
  autoLoadEntities: true,
  synchronize: true,
  logging: true,
});
