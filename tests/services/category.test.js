jest.mock('../../src/config/redis');
jest.mock('../../src/category/model');

const redis = require('../../src/config/redis');
const model = require('../../src/category/model');
const service = require('../../src/category/service');

describe('Category Service', () => {
  describe('Get Categories', () => {
    const options = {
      key: 'categories:all',
    };
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when redis get failed', async () => {
      // Arrange
      redis.get.mockRejectedValue(new Error());

      // Assert
      await expect(service.categories(options)).rejects.toThrow();
      expect(redis.get).toHaveBeenCalledWith(options.key);
      expect(model.getCategories).not.toHaveBeenCalled();
      expect(redis.save).not.toHaveBeenCalled();
    });

    test('should return redis when cache available', async () => {
      // Arrange
      redis.get.mockResolvedValue({
        categories: 'all',
        from: 'cache',
      });

      // Act
      const result = await service.categories(options);

      // Assert
      expect(redis.get).toHaveBeenCalledWith(options.key);
      expect(result).toEqual({
        categories: 'all',
        from: 'cache',
      });
      expect(model.getCategories).not.toHaveBeenCalled();
      expect(redis.save).not.toHaveBeenCalled();
    });

    test('should return db when cache not available', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);
      model.getCategories.mockResolvedValue({
        categories: 'all',
        from: 'db',
      });
      redis.save.mockResolvedValue();

      // Act
      const result = await service.categories(options);

      // Assert
      expect(redis.get).toHaveBeenCalledWith(options.key);
      expect(result).toEqual({
        categories: 'all',
        from: 'db',
      });
      expect(redis.save).toHaveBeenCalledWith({
        key: options.key,
        value: { categories: 'all', from: 'db' },
      });
    });
  });

  describe('Create Or Update Categories', () => {
    function options(params) {
      return {
        key: 'category:some_id',
        id: 'some_id',
        name: 'item4',
        ...params,
      };
    }
    const categories = jest.fn();
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when get categories failed', async () => {
      // Arrange
      categories.mockRejectedValue(new Error());

      // Assert
      await expect(service.createOrUpdate(options())).rejects.toThrow();
      expect(model.createCategory).not.toHaveBeenCalled();
      expect(model.updateCategory).not.toHaveBeenCalled();
      expect(redis.clearCache).not.toHaveBeenCalled();
    });

    test('should return id and name when success create', async () => {
      // Arrange
      const input = options();
      jest
        .spyOn(service, 'categories')
        .mockResolvedValue([
          { name: 'item1' },
          { name: 'item2' },
          { name: 'item3' },
        ]);
      model.createCategory.mockResolvedValue({
        id: 4,
        name: 'item4',
      });

      // Act
      const result = await service.createOrUpdate(input);

      // Assert
      expect(model.createCategory).toHaveBeenCalledWith(input);
      expect(model.updateCategory).not.toHaveBeenCalled();
      expect(redis.clearCache).toHaveBeenCalled();
      expect(result).toEqual({
        id: 4,
        name: 'item4',
      });
    });

    test('should return id and name when success update', async () => {
      // Arrange
      const input = options({
        id: 4,
        update: true,
        name: 'item4 updated',
      });
      jest
        .spyOn(service, 'categories')
        .mockResolvedValue([
          { name: 'item1' },
          { name: 'item2' },
          { name: 'item3' },
        ]);
      model.updateCategory.mockResolvedValue({
        id: 4,
        name: 'item4 updated',
      });

      // Act
      const result = await service.createOrUpdate(input);

      // Assert
      expect(model.updateCategory).toHaveBeenCalledWith(input);
      expect(model.createCategory).not.toHaveBeenCalled();
      expect(redis.clearCache).toHaveBeenCalledWith(['categories', 'category']);
      expect(result).toEqual({
        id: 4,
        name: 'item4 updated',
      });
    });
  });
});
