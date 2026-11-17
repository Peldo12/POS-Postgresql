jest.mock('../../src/config/pool');
jest.mock('../../src/config/redis');

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/pool');
const { client } = require('../../src/config/redis');

describe('App Route', () => {
  test('should return welcome message', async () => {
    const res = await request(app).get('/api/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      message: 'Welcome to POS Backend API',
    });
  });

  test('should return health status', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });
    client.ping.mockResolvedValue('PONG');

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('should return 404 when route not found', async () => {
    const res = await request(app).get('/api/not-found');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('/api/not-found');
  });
});
