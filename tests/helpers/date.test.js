const dateNow = require('../../src/common/helpers/date');

describe('Date Helper', () => {
  let now;
  beforeAll(() => {
    now = dateNow('iso');
  });
  test('should return valid date string', () => {
    expect(typeof now).toEqual('string');
    expect(now).toMatch(/^[0-9TZ:.-]+$/);
  });

  test('should return valid date object', () => {
    const newNow = dateNow('raw');
    expect(typeof newNow).toEqual('object');
  });

  test('should return equal date string', () => {
    const newNow = dateNow('iso');
    expect(newNow).toEqual(newNow);
  });

  test('should return not equal date string', () => {
    const newNow = dateNow('string');
    expect(now).not.toEqual(newNow);
  });

  test('should throw error when non supported type', () => {
    expect(() => {
      dateNow('test');
    }).toThrow();
  });

  test('should throw error when no type', () => {
    expect(() => {
      dateNow();
    }).toThrow();
  });
});
