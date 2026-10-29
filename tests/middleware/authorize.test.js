const authorize = require('../../src/common/middleware/authorize');

describe('Middleware Authorize', () => {
  let res;
  let next;
  beforeEach(() => {
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should call next when authorize success', () => {
    const req = {
      user: {
        emailVerified: '2026-10-25T00:15:24.025Z',
        role: 'admin',
      },
    };
    authorize(['admin'])(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should pass error to next when user not verified', () => {
    const req = {
      user: {
        emailVerified: null,
        role: 'admin',
      },
    };
    authorize(['admin'])(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('should call next with error when user role not allowed', () => {
    const req = {
      user: {
        emailVerified: '2026-10-25T00:15:24.025Z',
        role: 'user',
      },
    };
    authorize(['admin'])(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('should throw error when type allowed role not array', () => {
    expect(() => {
      authorize('admin');
    }).toThrow();
  });

  test('should throw error when no allowed role given', () => {
    expect(() => {
      authorize([]);
    }).toThrow();
  });
});
