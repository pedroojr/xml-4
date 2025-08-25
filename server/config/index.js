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
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  helmet: {
    contentSecurityPolicy:
      process.env.ENABLE_CSP === 'true'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              scriptSrc: ["'self'"],
              connectSrc: ["'self'"],
            },
          }
        : false,
    crossOriginEmbedderPolicy:
      process.env.CROSS_ORIGIN_EMBEDDER_POLICY === 'true',
  },
  bodyLimit: process.env.BODY_LIMIT || '50mb',
  upload: {
    maxFileSize:
      (parseInt(process.env.UPLOAD_MAX_FILESIZE_MB, 10) || 10) * 1024 * 1024,
  },
};

export default config;
