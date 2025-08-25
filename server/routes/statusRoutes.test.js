import express from 'express';
import request from 'supertest';
import { authMiddleware } from '../middleware/auth.js';
import statusRoutes from './statusRoutes.js';

process.env.API_KEY = 'testkey';

const app = express();
app.use(authMiddleware);
app.use('/api', statusRoutes);

describe('GET /api/status', () => {
  it('should return API status information', async () => {
    const res = await request(app)
      .get('/api/status')
      .set('x-api-key', 'testkey');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body).toHaveProperty('timestamp');
  });
});
