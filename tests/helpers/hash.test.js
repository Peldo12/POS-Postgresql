const hash = require('../../src/common/helpers/hash');

describe('Hash Helper', () => {
  test('create should return hashed password', async () => {
    const password = '123456';

    const hashed = await hash.create(password);

    expect(hashed).not.toBe(password);
    expect(typeof hashed).toBe('string');
  });

  test('compare should return true for valid password', async () => {
    const password = '123456';

    const hashed = await hash.create(password);

    const valid = await hash.verify(password, hashed);

    expect(valid).toBe(true);
  });

  test('compare should return false for invalid password', async () => {
    const hashed = await hash.create('123456');

    const valid = await hash.verify('abcdef', hashed);

    expect(valid).toBe(false);
  });
});
