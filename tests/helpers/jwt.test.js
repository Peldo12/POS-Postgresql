const { generateJWT, verifyJWT } = require('../../src/common/helpers/jwt');

describe('JWT Helper', () => {
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

  test('should generate access token', () => {
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^[a-zA-Z0-9-_.]+$/);
    expect(token.length).toBeGreaterThan(0);
  });

  test('should verify valid token token', () => {
    const decoded = verifyJWT({ token });

    expect(typeof decoded).toBe('object');
    expect(decoded).toHaveProperty('id', payload.id);
    expect(decoded).toHaveProperty('username', payload.username);
    expect(decoded).toHaveProperty('role', payload.role);
  });

  test('should throw when signature invalid', () => {
    const invalid = `${token}invalid`;

    expect(() => {
      verifyJWT({ token: invalid });
    }).toThrow();
  });

  test('should throw in random token', () => {
    expect(() => {
      verifyJWT({ token: 'random-token-not jwt' });
    }).toThrow();
  });

  test('should throw in secret change', () => {
    const backup = process.env.ACCESS_SECRET;

    try {
      process.env.ACCESS_SECRET = 'secret-change-to-random-string';
      expect(() => {
        verifyJWT({ token });
      }).toThrow();
    } finally {
      process.env.ACCESS_SECRET = backup;
    }
  });

  test('should throw in secret missing', () => {
    const backup = process.env.ACCESS_SECRET;

    try {
      delete process.env.ACCESS_SECRET;

      expect(() => {
        generateJWT({ payload });
      }).toThrow();
    } finally {
      process.env.ACCESS_SECRET = backup;
    }
  });
});
