import { DataSource, DataSourceOptions } from 'typeorm';
import { DotenvConfig } from './env.config';
import * as Entities from '../entities';

const useSSL = DotenvConfig.DB_SSL || (!!DotenvConfig.DATABASE_URL && DotenvConfig.DATABASE_URL.includes('supabase'));

const dbConfig: DataSourceOptions = DotenvConfig.DATABASE_URL
  ? {
      type: 'postgres',
      url: DotenvConfig.DATABASE_URL,
      entities: Object.values(Entities),
      synchronize: true,
      logging: false,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    }
  : {
      type: 'postgres',
      host: DotenvConfig.DB_HOST || 'localhost',
      port: +(DotenvConfig.DB_PORT || 5432),
      username: DotenvConfig.DB_USERNAME || 'postgres',
      password: DotenvConfig.DB_PASSWORD || 'postgres',
      database: DotenvConfig.DB_NAME || 'busapp',
      entities: Object.values(Entities),
      synchronize: true,
      logging: false,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    };

export const AppDataSource = new DataSource(dbConfig);

