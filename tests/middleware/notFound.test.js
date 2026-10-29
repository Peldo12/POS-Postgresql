const notFound = require('../../src/common/middleware/notFound');

describe('Middleware Not Found', () => {
  let req;
  let res;
  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/product/ramdom/',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test('should return res when route not found', () => {
    notFound(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });
});
