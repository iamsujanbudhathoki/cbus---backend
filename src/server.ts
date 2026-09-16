import express from 'express';
import 'reflect-metadata';
import { Client } from 'pg';
import { AppDataSource } from './config/database.config';
import { DotenvConfig } from './config/env.config';
import { configMiddleware } from './middlewares';
import { PathUtils } from './utils/path.util';
// import { RedisUtil } from './utils/redis.util';

class Server {
  constructor() {
    this.bootstrap();
  }

  // bootstrap
  async bootstrap() {
    await this.initializePath();
    await this.migrateLegacyRoles();
    AppDataSource.initialize()
      .then(() => {
        console.log('Data Source has been initialized!');
        const app = express();
        configMiddleware(app);
        // new RedisUtil().initialize();
        app.listen(DotenvConfig.PORT, () => {
          console.log('TCP server established');
        });
      })
      .catch((err) => {
        console.error('Error during Data Source initialization', err);
      });
  }

  async migrateLegacyRoles() {
    try {
      const dbUrl = DotenvConfig.DATABASE_URL;
      if (!dbUrl) return;
      const useSSL = dbUrl.includes('supabase') || dbUrl.includes('pooler');
      const client = new Client({
        connectionString: dbUrl,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      });
      await client.connect();
      await client.query("UPDATE users SET role = 'ADMIN' WHERE role::text = 'SUPER_ADMIN'");
      await client.end();
    } catch {
      // Ignore if table or database does not exist yet prior to initial sync
    }
  }

  async initializePath() {
    await PathUtils.ensureDir(DotenvConfig.TEMP_FOLDER_PATH);
    await PathUtils.ensureDir(DotenvConfig.MEDIA_TEMP_PATH);
    await PathUtils.ensureDir(DotenvConfig.MEDIA_UPLOAD_PATH!);
  }
}

new Server();
