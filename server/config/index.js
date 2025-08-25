import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = path.join(rootDir, `.env.${nodeEnv}`);
dotenv.config({ path: envFile });

const config = {
  env: nodeEnv,
  port: parseInt(process.env.PORT, 10) || 3001,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'],
  apiKey: process.env.API_KEY || '',
  dbPath: path.resolve(rootDir, process.env.DB_PATH || 'server/database.sqlite'),
  debugDb: process.env.DEBUG_DB === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
