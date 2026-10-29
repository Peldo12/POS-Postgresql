const { generateJWT } = require('../../src/common/helpers/jwt');
const authenticate = require('../../src/common/middleware/authentication');

describe('Middleware Auth', () => {
  describe('Auth Headers', () => {
    let token;
    let payload;
    beforeAll(() => {
      process.env.ACCESS_SECRET = 'test-access-secret';
      process.env.REFRESH_SECRET = 'test-refresh-secret';
      payload = {
        id: 10,
        username: 'bang',
        role: 'test_role',
      };
      token = generateJWT({ payload });
    });

    test('should call next when bearer token is valid', () => {
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {};
      const next = jest.fn();
      authenticate.headers(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toHaveProperty('id', payload.id);
      expect(req.user).toHaveProperty('username', payload.username);
      expect(req.user).toHaveProperty('role', payload.role);
    });

    test('should call next when authorization headers missing', () => {
      const req = {
        headers: {},
      };
      const res = {};
      const next = jest.fn();
      authenticate.headers(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should call next when bearer prefix missing', () => {
      const req = {
        headers: {
          authorization: '',
        },
      };
      const res = {};
      const next = jest.fn();
      authenticate.headers(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should call next when token invalid', () => {
      const req = {
        headers: {
          authorization: 'Bearer radom-token-test',
        },
      };
      const res = {};
      const next = jest.fn();
      authenticate.headers(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should call next when token malformed', () => {
      const req = {
        headers: {
          authorization: `Bearer ${token.replace(/\W/g, 'Abc')}`,
        },
      };
      const res = {};
      const next = jest.fn();
      authenticate.headers(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
