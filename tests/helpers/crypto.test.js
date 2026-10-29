const { bytes, md5 } = require('../../src/common/helpers/crypto');

describe('Crypto Helper', () => {
  describe('Bytes Helper', () => {
    let emailToken;
    beforeAll(() => {
      emailToken = bytes('email');
    });
    test('should return valid crypto bytes', () => {
      expect(typeof emailToken).toBe('string');
      expect(emailToken).toMatch(/^[a-f0-9]+$/);
      expect(emailToken).toHaveLength(16);
    });

    test('should return not equal value', () => {
      const secondEmailToken = bytes('pass');
      expect(emailToken).not.toBe(secondEmailToken);
    });

    test('should throw error when type undefined', () => {
      expect(() => {
        bytes();
      }).toThrow();
    });

    test('should throw error when type invalid', () => {
      expect(() => {
        bytes('test');
      }).toThrow();
    });
  });

  describe('md5 Helper', () => {
    let key;
    let filters;
    let prefix;
    let hashed;
    beforeAll(() => {
      filters = {
        limit: 3,
        sort: 'id',
        orderBy: 'DESC',
      };

      key = md5('products', filters);
      [prefix, hashed] = key.split(':');
    });
    test('should return string', () => {
      expect(typeof key).toBe('string');
    });

    test('should return "prefix:hash"', () => {
      expect(prefix).toEqual('products');
      expect(hashed).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should generate valid hex hash', () => {
      expect(hashed).toHaveLength(32);
    });

    test('should generate valid same token', () => {
      const key2 = md5('products', filters);
      expect(key2).toEqual(key);
    });

    test('should generate different hash when filters changed', () => {
      const key3 = md5('products', { ...filters, range: 'today' });
      expect(key).not.toEqual(key3);
    });

    test('should generate different hash when prefix changed', () => {
      const key4 = md5('categories', filters);
      expect(key).not.toEqual(key4);
    });

    test('should throw error when no value given', () => {
      expect(() => {
        md5('users');
      }).toThrow();
    });

    test('should throw error when nothing given', () => {
      expect(() => {
        md5();
      }).toThrow();
    });
  });
});
