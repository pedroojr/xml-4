import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import nfeRoutes from './routes/nfeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import db, { DB_PATH } from './models/database.js';
import { authMiddleware } from './middleware/auth.js';
import logger from './utils/logger.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(authMiddleware);

// Rotas
app.use('/api/nfes', nfeRoutes);
app.use('/api', uploadRoutes);
app.use('/api', statusRoutes);
if (process.env.DEBUG_DB === 'true') {
  app.use('/api', debugRoutes);
}

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📊 Banco de dados: ${DB_PATH}`);
  logger.info(`🌐 Acesse: http://localhost:${PORT}`);
  logger.info(`📋 API Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Encerrando servidor...');
  db.close();
  process.exit(0);
});
