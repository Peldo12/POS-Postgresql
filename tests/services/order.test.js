jest.mock('../../src/common/helpers/model');
jest.mock('../../src/config/redis');
jest.mock('../../src/order/model');

const redis = require('../../src/config/redis');
const model = require('../../src/order/model');
const service = require('../../src/order/service');
const { transaction } = require('../../src/common/helpers/model');

describe('Order Service', () => {
  const input = {};
  const fakeClient = {};
  describe('Get Orders', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when db failed', async () => {
      // Arrange
      model.getOrders.mockRejectedValue(new Error());

      // Assert
      await expect(service.orders(input)).rejects.toThrow();
      expect(redis.save).not.toHaveBeenCalled();
    });

    test('should return items when success', async () => {
      // Arrange
      model.getOrders.mockResolvedValue('items');

      // Act
      const result = await service.orders(input);

      // Assert
      expect(model.getOrders).toHaveBeenCalledWith(input);
      expect(redis.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual('items');
    });
  });
});
