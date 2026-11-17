jest.mock('../../src/order/service');
jest.mock('../../src/product/service');

const orderService = require('../../src/order/service');
const productService = require('../../src/product/service');
const dashService = require('../../src/dashboard/service');

describe('Dashboard Service - get', () => {
  const options = {};
  beforeEach(() => {
    productService.getStats.mockResolvedValue({
      stats: { products: 100, categories: 8, low: 5 },
    });
    orderService.getStats.mockResolvedValue({
      orders: 10,
      omzet: 1000000,
      items: 250,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should throw error if some service failed', async () => {
    // Arrange
    productService.getStats.mockRejectedValue(new Error());

    // Assert
    await expect(dashService.getStats(options)).rejects.toThrow();
  });

  test('should return today stats as default', async () => {
    // Assert
    await expect(dashService.getStats(options)).resolves.toEqual({
      categories: 8,
      items: 250,
      low: 5,
      omzet: 1000000,
      orders: 10,
      products: 100,
    });
  });
});
