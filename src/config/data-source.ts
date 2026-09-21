import 'dotenv/config';
import { DataSource } from 'typeorm';

// DataSource dedie a la CLI TypeORM (migration:generate/run/revert).
// L'application elle-meme se configure via buildTypeOrmConfig (typeorm.config.ts) ;
// ce fichier ne sert que hors du contexte Nest.
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'linguere',
  ssl:
    process.env.DB_SSL_MODE === 'REQUIRED'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
        }
      : undefined,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
});
