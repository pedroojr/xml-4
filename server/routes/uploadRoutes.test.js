import express from 'express';
import request from 'supertest';
import { authMiddleware } from '../middleware/auth.js';
import uploadRoutes from './uploadRoutes.js';

process.env.API_KEY = 'testkey';

const app = express();
app.use(authMiddleware);
app.use('/api', uploadRoutes);

describe('POST /api/upload-xml', () => {
  it('should upload XML file successfully', async () => {
    const res = await request(app)
      .post('/api/upload-xml')
      .set('x-api-key', 'testkey')
      .attach('xml', Buffer.from('<root></root>'), 'file.xml');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Arquivo recebido com sucesso');
    expect(res.body.content).toContain('<root');
  });

  it('should return 400 when no file is provided', async () => {
    const res = await request(app)
      .post('/api/upload-xml')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
