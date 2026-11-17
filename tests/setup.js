jest.mock('../src/common/middleware/logger', () => ({
  info: jest.fn(),
  http: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
}));
