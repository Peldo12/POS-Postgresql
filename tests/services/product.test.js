jest.mock('../../src/common/helpers/model');
jest.mock('../../src/config/redis');
jest.mock('../../src/product/model');
jest.mock('../../src/product/info');
jest.mock('../../src/product/log');

const redis = require('../../src/config/redis');
const model = require('../../src/product/model');
const info = require('../../src/product/info');
const log = require('../../src/product/log');
const service = require('../../src/product/service');
const { transaction } = require('../../src/common/helpers/model');

describe('Product Service', () => {
  const fakeClient = {};
  info.create.mockResolvedValue();
  log.create.mockResolvedValue();
  describe('Get Products', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return items and pagination when success', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);
      model.productJoin.mockResolvedValue({
        items: {},
        pagination: {},
      });
      jest.spyOn(service, 'getProducts');

      // Act
      const input = { sort: 'id' };
      const key = await service.createProductKey(input);
      const result = await service.getProducts(input);

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.productJoin).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        items: {},
        pagination: {},
      });
    });
  });

  describe('Create Product', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    function insertTo(params) {
      return {
        ...params,
        user: {},
      };
    }
    test('should throw error when get products failed', async () => {
      // Arrange
      model.productJoin.mockRejectedValue(new Error());

      // Act
      const input = insertTo({ product: {}, user: {} });

      // Assert
      await expect(service.createProduct(input)).rejects.toThrow();
      expect(model.create).not.toHaveBeenCalled();
      expect(redis.clearCache).not.toHaveBeenCalled();
    });

    test('should throw error when get sku used', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({
        products: [{ sku: 'SKU001' }, { sku: 'SKU002' }],
      });

      // Act
      const input = insertTo({
        product: {
          sku: 'SKU001',
        },
      });

      // Assert
      await expect(service.createProduct(input)).rejects.toThrow();
      expect(model.create).not.toHaveBeenCalled();
      expect(redis.clearCache).not.toHaveBeenCalled();
    });

    test('should return created items', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({
        products: [],
      });
      model.create.mockResolvedValue(['items']);

      // Act
      const input = insertTo({
        product: {
          sku: 'SKU003',
        },
      });
      const result = await service.createProduct(input);

      // Assert
      expect(model.create).toHaveBeenCalled();
      expect(redis.clearCache).toHaveBeenCalledWith(['products', 'product']);
      expect(result).toEqual('items');
    });
  });

  describe('Update Product', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    function insertTo(params) {
      return {
        ...params,
        user: {},
      };
    }

    test('should throw error when product not found', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({
        products: [],
      });

      // Act
      const input = insertTo({
        product: [
          {
            id: 'some_uuid',
            sku: 'SKU002',
            category_id: 1,
          },
        ],
      });

      // Assert
      await expect(service.updateProduct(input)).rejects.toThrow(
        'Product not found'
      );
      expect(model.update).not.toHaveBeenCalled();
    });

    test('should throw error when sku changed', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({
        products: [{ id: 'some_uuid', sku: 'SKU001' }],
      });

      // Act
      const input = insertTo({
        product: [
          {
            id: 'some_uuid',
            sku: 'SKU002',
            category_id: 1,
          },
        ],
      });

      // Assert
      await expect(service.updateProduct(input)).rejects.toThrow(
        'SKU cannot be changed'
      );
      expect(model.update).not.toHaveBeenCalled();
    });

    test('should return items when product updated', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({
        products: [{ id: 'some_uuid', sku: 'SKU001' }],
      });
      model.update.mockResolvedValue('items');

      // Act
      const input = insertTo({
        product: {
          id: 'some_uuid',
          sku: 'SKU001',
          category_id: 1,
        },
      });
      const result = await service.updateProduct(input);

      // Assert
      expect(result).toEqual('items');
    });
  });

  describe('Update Product Stock', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    function currentInput() {
      return [
        {
          id: 6,
          quantity: 23,
        },
        {
          id: 7,
          quantity: -1,
        },
      ];
    }
    const user = {
      username: 'bang',
      userId: 'some_uuid',
    };

    test('should throw error when product not found', async () => {
      // Arrange
      model.productJoin
        .mockResolvedValueOnce({ products: [{ id: 6 }] })
        .mockResolvedValueOnce({ products: [{ id: 7 }] })
        .mockResolvedValueOnce({ products: [] });
      model.decreaseStock.mockResolvedValue({ rowCount: 1 });
      model.increaseStock.mockResolvedValue({ rowCount: 1 });

      // Act
      const input = currentInput();
      input.push({
        id: 8,
        quantity: -1,
      });

      // Assert
      await expect(service.updateStocks(input, user)).rejects.toThrow(
        'Product not found'
      );
    });

    test('should throw error when insufficient stock', async () => {
      // Arrange
      model.productJoin
        .mockResolvedValueOnce({ products: [{ id: 6 }] })
        .mockResolvedValueOnce({ products: [{ id: 7 }] });
      model.decreaseStock.mockResolvedValue({ rowCount: 0 });
      model.increaseStock.mockResolvedValue({ rowCount: 1 });

      // Act
      const input = currentInput();

      // Assert
      await expect(service.updateStocks(input, user)).rejects.toThrow(
        'Insufficient stock product'
      );
    });

    test('should return success updated stocks', async () => {
      // Arrange
      model.productJoin
        .mockResolvedValueOnce({ products: [{ id: 6 }] })
        .mockResolvedValueOnce({ products: [{ id: 7 }] });
      model.decreaseStock.mockResolvedValue({ rowCount: 1 });
      model.increaseStock.mockResolvedValue({ rowCount: 1 });

      // Act
      const input = currentInput();
      const result = await service.updateStocks(input, user);

      // Assert
      expect(model.increaseStock).toHaveBeenCalledWith(
        {
          id: 6,
          quantity: 23,
        },
        fakeClient
      );
      expect(model.decreaseStock).toHaveBeenCalledWith(
        {
          id: 7,
          quantity: -1,
        },
        fakeClient
      );
      expect(result).toEqual([
        { id: 6, status: 'success' },
        { id: 7, status: 'success' },
      ]);
    });
  });

  describe('Remove Or Restore Product', () => {
    const input = {
      id: 'some_uuid',
      value: 'some_date',
      user: {
        userId: 'some_uuid',
      },
    };
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when product not found', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({ products: [] });

      // Assert
      await expect(service.removeOrRestoreProduct(input)).rejects.toThrow(
        'Product not found or deleted'
      );
      expect(model.removeOrRestore).not.toHaveBeenCalled();
      expect(log.create).not.toHaveBeenCalled();
      expect(redis.clearCache).not.toHaveBeenCalled();
      expect(model.productJoin).toHaveBeenCalledTimes(1);
    });

    test('should throw error when product not deleted', async () => {
      // Arrange
      model.productJoin.mockResolvedValue({ products: [] });

      // Act
      input.value = null;

      // Assert
      await expect(service.removeOrRestoreProduct(input)).rejects.toThrow(
        'Product not deleted'
      );
      expect(model.removeOrRestore).not.toHaveBeenCalled();
      expect(log.create).not.toHaveBeenCalled();
      expect(redis.clearCache).not.toHaveBeenCalled();
      expect(model.productJoin).toHaveBeenCalledTimes(1);
    });

    test('should return products where deleted is date when remove', async () => {
      // Arrange
      model.productJoin
        .mockResolvedValueOnce({
          products: [{ id: 'some_uuid', deleted: null }],
        })
        .mockResolvedValueOnce({
          products: [{ id: 'some_uuid', deleted: 'some_date' }],
        });
      model.removeOrRestore.mockResolvedValue();

      // Act
      const result = await service.removeOrRestoreProduct(input);

      // Assert
      expect(result).toEqual({
        products: [{ deleted: 'some_date', id: 'some_uuid' }],
      });
      expect(model.productJoin).toHaveBeenCalledTimes(2);
    });

    test('should return products where deleted is null when restore', async () => {
      // Arrange
      model.productJoin
        .mockResolvedValueOnce({
          products: [{ id: 'some_uuid', deleted: 'some_date' }],
        })
        .mockResolvedValueOnce({
          products: [{ id: 'some_uuid', deleted: null }],
        });
      model.removeOrRestore.mockResolvedValue();

      // Act
      const result = await service.removeOrRestoreProduct(input);

      // Assert
      expect(result).toEqual({
        products: [{ deleted: null, id: 'some_uuid' }],
      });
      expect(model.productJoin).toHaveBeenCalledTimes(2);
    });
  });
});
