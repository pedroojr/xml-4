import express from 'express';
import request from 'supertest';

// Controller que força um erro ao chamar next com uma exceção
const faultyController = (req, res, next) => {
  next(new Error('Erro forçado'));
};

const app = express();
app.get('/erro', faultyController);

// Middleware de tratamento de erros semelhante ao usado no servidor
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Algo deu errado!' });
});

describe('Middleware de erro', () => {
  it('retorna status 500 quando ocorre um erro', async () => {
    const res = await request(app).get('/erro');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Algo deu errado!');
  });
});

