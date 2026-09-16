import dotenv from 'dotenv';
import path from 'path';

export enum Environment {
  DEVELOPMENT = 'DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
  TEST = 'TEST',
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class DotenvConfig {
  // APP
  static PORT = process.env.PORT || 5000;
  static NODE_ENV = process.env.NODE_ENV || 'development';

  // DB
  static DATABASE_URL = process.env.DATABASE_URL;


  // MAIL
  static MAIL_HOST = process.env.MAIL_HOST;
  static MAIL_USER = process.env.MAIL_USER;
  static MAIL_PASSWORD = process.env.MAIL_PASSWORD;

  // LOG
  static LOG_LEVEL = process.env.LOG_LEVEL || 'info';

  // URL
  static FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
  static BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

  // MEDIA & TEMP PATHS WITH FALLBACKS
  static MEDIA_TEMP_PATH = process.env.MEDIA_TEMP_PATH || path.join(process.cwd(), 'temp/media');
  static MEDIA_UPLOAD_PATH = process.env.MEDIA_UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  static TEMP_FOLDER_PATH = process.env.TEMP_FOLDER_PATH || path.join(process.cwd(), 'temp');
}

export { DotenvConfig };
