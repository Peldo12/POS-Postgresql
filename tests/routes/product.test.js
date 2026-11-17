jest.mock('../../src/product/service');
jest.mock('../../src/common/middleware/authentication');

const request = require('supertest');
const app = require('../../src/app');
const authentication = require('../../src/common/middleware/authentication');
const AppError = require('../../src/common/utils/AppError');
const service = require('../../src/product/service');

describe('Product Routes', () => {
  describe('Get Product', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 403 when unauthorize role', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'other',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app).get('/api/product?page=dua');

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        status: 'fail',
        message: "You're not allowed to perform this action",
      });
    });

    test('should return 401 when email not verified', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: null,
        };

        next();
      });

      // Act
      const res = await request(app).get('/api/product');

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'Your email was not verified',
      });
    });

    test('should return 400 when filtering fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app).get('/api/product?page=dua');

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'Page must a number',
      });
    });

    test('should return 500 when service fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });
      service.getProducts.mockRejectedValue(
        new Error('Internal Service Error')
      );

      // Act
      const res = await request(app).get('/api/product');

      // Assert
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'Internal Service Error',
      });
    });

    test('should return list of products', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.getProducts.mockResolvedValue({
        products: [
          {
            id: 6,
            sku: 'SKU002',
            barcode: '98156',
            name: 'Product Test 2',
            category: 'Test category kedua',
            buy: 1002,
            sell: 5002,
            image: null,
            deleted_at: null,
          },
          {
            id: 7,
            sku: 'SKU003',
            barcode: '98157',
            name: 'Product Test 3',
            category: 'Test category kedua',
            buy: 1003,
            sell: 5003,
            image: null,
            deleted_at: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
        },
      });

      // Act
      const res = await request(app).get('/api/product');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Products are loaded',
        data: {
          items: [
            {
              id: 6,
              sku: 'SKU002',
              barcode: '98156',
              name: 'Product Test 2',
              category: 'Test category kedua',
              buy: 1002,
              sell: 5002,
              image: null,
              deleted_at: null,
            },
            {
              id: 7,
              sku: 'SKU003',
              barcode: '98157',
              name: 'Product Test 3',
              category: 'Test category kedua',
              buy: 1003,
              sell: 5003,
              image: null,
              deleted_at: null,
            },
          ],
        },
        meta: {
          page: 1,
          limit: 10,
          total: 3,
        },
      });
    });
  });

  describe('Get Product ID', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 400 if id not number', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app).get('/api/product/lapan');

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'ID must a number',
      });
    });

    test('should return 404 if product not found', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.getProducts.mockRejectedValue(
        new AppError(404, 'Product not found')
      );

      // Act
      const res = await request(app).get('/api/product/8');

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'Product not found',
      });
    });

    test('should return single of products', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.getProducts.mockResolvedValue({
        products: [
          {
            id: 6,
            sku: 'SKU002',
            barcode: '98156',
            name: 'Product Test 2',
            category: 'Test category kedua',
            buy: 1002,
            sell: 5002,
            image: null,
            deleted_at: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
        },
      });

      // Act
      const res = await request(app).get('/api/product/6');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Product are loaded',
        data: {
          items: [
            {
              id: 6,
              sku: 'SKU002',
              barcode: '98156',
              name: 'Product Test 2',
              category: 'Test category kedua',
              buy: 1002,
              sell: 5002,
              image: null,
              deleted_at: null,
            },
          ],
        },
      });
    });
  });

  describe('Create Product', () => {
    const buildOptions = (overrides = {}) => ({
      sku: 'SKU004',
      barcode: '9811',
      name: 'Product Test 1',
      buy: 1000,
      sell: 5000,
      category_id: 1,
      stock: 10,
      weight: 100,
      ...overrides,
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 400 if validation fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app)
        .post('/api/product/create')
        .send({ ...buildOptions({ sku: 'Invalid SKU' }) });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'SKU must a string and number only',
      });
    });

    test('should return 400 if sku used', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.createProduct.mockRejectedValue(
        new AppError(400, 'SKU already used')
      );

      // Act
      const res = await request(app)
        .post('/api/product/create')
        .send(buildOptions());

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'SKU already used',
      });
    });

    test('should return details created product', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.createProduct.mockResolvedValue({ name: 'Product Test 1' });

      // Act
      const res = await request(app)
        .post('/api/product/create')
        .send(buildOptions());

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Product Product Test 1 created',
        data: {
          items: {
            name: 'Product Test 1',
          },
        },
      });
    });
  });

  describe('Update Product', () => {
    const buildOptions = (overrides = {}) => ({
      sku: 'SKU004',
      barcode: '9811',
      name: 'Product Test 1 Updated',
      buy: 1000,
      sell: 5000,
      category_id: 1,
      stock: 10,
      weight: 100,
      ...overrides,
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 400 if validation fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app)
        .put('/api/product/1/update')
        .send({ ...buildOptions({ sku: 'Invalid SKU' }) });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'SKU must a string and number only',
      });
    });

    test('should return 400 if sku changed', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.updateProduct.mockRejectedValue(
        new AppError(400, 'SKU cannot be changed')
      );

      // Act
      const res = await request(app)
        .put('/api/product/1/update')
        .send(buildOptions());

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'SKU cannot be changed',
      });
    });

    test('should return details updated product', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      service.updateProduct.mockResolvedValue({ name: 'Product Test 1' });

      // Act
      const res = await request(app)
        .put('/api/product/1/update')
        .send(buildOptions());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Product updated',
        data: {
          items: {
            name: 'Product Test 1',
          },
        },
      });
    });
  });

  describe('Update Stocks', () => {
    const options = [
      {
        id: 6,
        quantity: 23,
      },
      {
        id: 7,
        quantity: 15,
      },
    ];

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 400 if validation fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      options.push({ id: 'Invalid ID', quantity: 1 });
      const res = await request(app).patch('/api/product/stocks/update').send({
        transactions: options,
      });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'ID must a number',
      });
    });

    test('should return 200 when update stocks', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      options.pop();
      const res = await request(app).patch('/api/product/stocks/update').send({
        transactions: options,
      });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Products stock updated',
      });
    });
  });

  describe('Remove Product', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 400 if validation fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app).patch('/api/product/satu/remove');

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'ID must a number',
      });
    });

    test('should return 404 if product not found', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });
      service.removeOrRestoreProduct.mockRejectedValue(
        new AppError(404, 'Product not found')
      );

      // Act
      const res = await request(app).patch('/api/product/1/remove');

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'Product not found',
      });
    });
    test('should return removed product detail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });
      service.removeOrRestoreProduct.mockResolvedValue({
        products: [{ name: 'Product Test To Remove' }],
      });

      // Act
      const res = await request(app).patch('/api/product/1/remove');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Product removed',
        data: {
          items: [
            {
              name: 'Product Test To Remove',
            },
          ],
        },
      });
    });
  });

  describe('Restore Product', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return 400 if validation fail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });

      // Act
      const res = await request(app).patch('/api/product/satu/restore');

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'ID must a number',
      });
    });

    test('should return 404 if product not found', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });
      service.removeOrRestoreProduct.mockRejectedValue(
        new AppError(404, 'Product not found')
      );

      // Act
      const res = await request(app).patch('/api/product/1/restore');

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: 'fail',
        message: 'Product not found',
      });
    });
    test.only('should return restored product detail', async () => {
      // Arrange
      authentication.headers.mockImplementation((req, res, next) => {
        req.user = {
          id: 'some_uuid',
          role: 'admin',
          emailVerified: 'some_date',
        };

        next();
      });
      service.removeOrRestoreProduct.mockResolvedValue({
        products: [{ name: 'Product Test To Restore' }],
      });

      // Act
      const res = await request(app).patch('/api/product/1/restore');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'Product restored',
        data: {
          items: [
            {
              name: 'Product Test To Restore',
            },
          ],
        },
      });
    });
  });
});
