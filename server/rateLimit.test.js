import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

const app = express();
const limiter = rateLimit({ windowMs: 1000, max: 2 });
app.use(limiter);
app.get('/test', (req, res) => {
  res.status(200).json({ ok: true });
});

describe('Rate limiter', () => {
  it('blocks requests exceeding the limit', async () => {
    await request(app).get('/test');
    await request(app).get('/test');
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
  });
});
