import { DataSource } from 'typeorm';
import { DotenvConfig } from './env.config';
import * as Entities from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DotenvConfig.DB_HOST || 'localhost',
  port: +(DotenvConfig.DB_PORT || 5432),
  username: DotenvConfig.DB_USERNAME || 'postgres',
  password: DotenvConfig.DB_PASSWORD || 'postgres',
  database: DotenvConfig.DB_NAME || 'busapp',
  entities: Object.values(Entities),
  synchronize: true,
  logging: false,
  // dropSchema: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
