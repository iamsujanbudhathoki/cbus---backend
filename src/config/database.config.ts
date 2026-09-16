import { DataSource } from 'typeorm';
import { DotenvConfig } from './env.config';
import * as Entities from '../entities';

const dbUrl = DotenvConfig.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: Object.values(Entities),
  synchronize: true,
  logging: false,
  ssl: dbUrl.includes('supabase') || dbUrl.includes('pooler') ? { rejectUnauthorized: false } : false,
});


