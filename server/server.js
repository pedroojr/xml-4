import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';

import nfeRoutes from './routes/nfeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import db, { DB_PATH } from './models/database.js';
import { authMiddleware } from './middleware/auth.js';
import logger from './utils/logger.js';
import config from './config/index.js';

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet(config.helmet));
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(authMiddleware);

// Rotas
app.use('/api/nfes', nfeRoutes);
app.use('/api', uploadRoutes);
app.use('/api', statusRoutes);
if (config.debugDb) {
  app.use('/api', debugRoutes);
}

// Middleware de tratamento de erros
app.use((err, req, res) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📊 Banco de dados: ${DB_PATH}`);
  logger.info(`🌐 Acesse: http://localhost:${PORT}`);
  logger.info(`📋 API Status: http://localhost:${PORT}/api/status`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Encerrando servidor...');
  db.close();
  process.exit(0);
});
