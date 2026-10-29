const hash = require('../../src/common/helpers/hash');

describe('Hash Helper', () => {
  let hashed;
  let password;
  beforeAll(async () => {
    password = '123456';
    hashed = await hash.create(password);
  });

  test('create should return hashed password', async () => {
    expect(hashed).not.toBe(password);
    expect(typeof hashed).toBe('string');
  });

  test('compare should return true for valid password', async () => {
    const valid = await hash.verify(password, hashed);
    expect(valid).toBe(true);
  });

  test('compare should return false for invalid password', async () => {
    const valid = await hash.verify('abcdef', hashed);
    expect(valid).toBe(false);
  });
});
