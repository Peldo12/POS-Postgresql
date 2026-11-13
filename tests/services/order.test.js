jest.mock('../../src/common/helpers/model');
jest.mock('../../src/config/redis');
jest.mock('../../src/order/model');
jest.mock('../../src/common/helpers/invoice');
jest.mock('../../src/product/service');
jest.mock('../../src/product/log');

const redis = require('../../src/config/redis');
const model = require('../../src/order/model');
const service = require('../../src/order/service');
const { transaction } = require('../../src/common/helpers/model');
const productService = require('../../src/product/service');
const productLog = require('../../src/product/log');
const { getNextInvoice } = require('../../src/common/helpers/invoice');

describe('Order Service', () => {
  const buildOptions = (overrides = {}) => ({
    orderId: 'some_uuid',
    userId: 'u1',
    username: 'kasir',
    value: null,
    products: [{ id: 'p1', quantity: 2 }],
    payment: { discount: 0, tax: 0, method: 'cash' },
    ...overrides,
  });
  const fakeClient = {};
  describe('Get Orders', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return items when success', async () => {
      // Arrange
      model.getOrders.mockResolvedValue('items');

      // Act
      const result = await service.orders(buildOptions({}));

      // Assert
      expect(model.getOrders).toHaveBeenCalledWith(buildOptions());
      expect(redis.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual('items');
    });
  });
  describe('Details Order', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when db failed', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);
      model.getOrders.mockRejectedValue(new Error());

      // Assert
      await expect(service.detailOrders(buildOptions())).rejects.toThrow();
      expect(model.getItems).not.toHaveBeenCalled();
      expect(redis.save).not.toHaveBeenCalled();
    });

    test('should throw error when order not found', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);
      model.getOrders.mockResolvedValue({ orders: [] });

      // Assert
      await expect(service.detailOrders(buildOptions())).rejects.toThrow(
        'Order not found'
      );
      expect(model.getItems).not.toHaveBeenCalled();
      expect(redis.save).not.toHaveBeenCalled();
    });

    test('should return detail order', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);
      model.getOrders.mockResolvedValue({ orders: [{ id: 'some_uuid' }] });
      model.getItems.mockResolvedValue({ detail: 'orders' });

      // Assert
      await expect(service.detailOrders(buildOptions())).resolves.toEqual({
        id: 'some_uuid',
        items: {
          detail: 'orders',
        },
      });
    });
  });

  describe('Create Order', () => {
    const catalog = {
      p1: { id: 'p1', name: 'Kopi', sell: 10000, stock: 10 },
      p2: { id: 'p2', name: 'Teh', sell: 5000, stock: 1 },
    };

    beforeEach(() => {
      // Arrange
      transaction.mockImplementation(async (cb) => cb(fakeClient));
      getNextInvoice.mockResolvedValue('INV-001');
      productService.getProducts.mockImplementation(async ({ id }) => ({
        products: catalog[id] ? [catalog[id]] : [],
      }));
      model.create.mockResolvedValue({ id: 'order1' });
      model.decreaseStock.mockResolvedValue({ rowCount: 1 });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('should create order with multiple products', async () => {
      // Act
      const options = buildOptions({
        products: [
          { id: 'p1', quantity: 2 },
          { id: 'p2', quantity: 1 },
        ],
        payment: { discount: 1000, tax: 500, method: 'cash' },
      });

      const result = await service.create(options);

      // Assert
      expect(model.create).toHaveBeenCalledWith({
        client: fakeClient,
        userId: 'u1',
        payment: {
          invoice: 'INV-001',
          subtotal: 25000,
          discount: 1000,
          tax: 500,
          total: 24500,
          method: 'cash',
        },
      });

      expect(model.detail).toHaveBeenCalledTimes(2);
      expect(model.detail).toHaveBeenNthCalledWith(1, {
        client: fakeClient,
        order: {
          orderId: 'order1',
          productId: 'p1',
          productName: 'Kopi',
          price: 10000,
          quantity: 2,
          subtotal: 20000,
        },
      });

      expect(model.decreaseStock).toHaveBeenNthCalledWith(1, {
        client: fakeClient,
        productId: 'p1',
        quantity: 2,
      });
      expect(model.decreaseStock).toHaveBeenCalledTimes(2);

      expect(productLog.create).toHaveBeenCalledTimes(2);
      expect(productLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STOCK_OUT',
          userId: 'u1',
          refId: 'p1',
          refType: 'ORDER',
        })
      );

      expect(redis.clearCache).toHaveBeenCalledWith([
        'products',
        'product',
        'orders',
        'order',
      ]);
      expect(result).toEqual({ id: 'order1' });
    });

    test('should throw 404 if product not found', async () => {
      // Act
      const options = buildOptions({ products: [{ id: 'xxx', quantity: 1 }] });

      // Assert
      await expect(service.create(options)).rejects.toThrow(
        'Product not found'
      );
      expect(model.create).not.toHaveBeenCalled();
    });

    test('should throw 400 if stock is not enough', async () => {
      // Act
      const options = buildOptions({ products: [{ id: 'p2', quantity: 5 }] });

      // Assert
      await expect(service.create(options)).rejects.toThrow(
        'Insufficient product stock'
      );
      expect(model.create).not.toHaveBeenCalled();
    });

    test('should throw 400 if total is negative', async () => {
      // Act
      const options = buildOptions({
        payment: { discount: 999999, tax: 0, method: 'cash' },
      });

      // Assert
      await expect(service.create(options)).rejects.toThrow(
        'Invalid total order'
      );
      expect(model.create).not.toHaveBeenCalled();
    });

    test('should throw 400 if decreaseStock updates no row', async () => {
      // Act
      model.decreaseStock.mockResolvedValue({ rowCount: 0 });

      // Assert
      await expect(service.create(buildOptions())).rejects.toThrow(
        'Insufficient product stock'
      );
      expect(productLog.create).not.toHaveBeenCalled();
      expect(redis.clearCache).not.toHaveBeenCalled();
    });
  });

  describe('Remove Or Restore Order', () => {
    beforeEach(() => {
      // Arrange
      redis.clearCache.mockResolvedValue();
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    test('should throw 404 if order not deleted', async () => {
      // Arrange
      model.getOrders.mockResolvedValue({ orders: [] });

      // Assert
      await expect(service.removeOrRestore(buildOptions())).rejects.toThrow(
        'Order not deleted'
      );
      expect(model.removeOrRestoreOrder).toHaveBeenCalledTimes(0);
      expect(redis.clearCache).toHaveBeenCalledTimes(0);
    });

    test('should throw 404 if order not found', async () => {
      // Arrange
      model.getOrders.mockResolvedValue({ orders: [] });

      // Assert
      await expect(
        service.removeOrRestore(buildOptions({ value: 'some_date' }))
      ).rejects.toThrow('Order not found or deleted');
      expect(model.removeOrRestoreOrder).toHaveBeenCalledTimes(0);
      expect(redis.clearCache).toHaveBeenCalledTimes(0);
    });

    test('should order id when order removed', async () => {
      // Arrange
      model.getOrders.mockResolvedValue({
        orders: [{ id: 'some_uuid_order' }],
      });
      model.removeOrRestoreOrder.mockResolvedValue({ id: 'some_uuid_order' });

      // Assert
      await expect(service.removeOrRestore(buildOptions())).resolves.toEqual({
        id: 'some_uuid_order',
      });
      expect(redis.clearCache).toHaveBeenCalledWith([
        'products',
        'product',
        'orders',
        'order',
      ]);
    });

    test('should order id when order restored', async () => {
      // Arrange
      model.getOrders.mockResolvedValue({
        orders: [{ id: 'some_uuid_order' }],
      });
      model.removeOrRestoreOrder.mockResolvedValue({ id: 'some_uuid_order' });

      // Assert
      await expect(
        service.removeOrRestore(buildOptions({ value: 'some_date' }))
      ).resolves.toEqual({
        id: 'some_uuid_order',
      });
      expect(redis.clearCache).toHaveBeenCalledWith([
        'products',
        'product',
        'orders',
        'order',
      ]);
    });
  });

  describe('Update Status Order', () => {
    beforeEach(() => {
      // Arrange
      redis.clearCache.mockResolvedValue();
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    test('should throw 404 if order not found', async () => {
      // Arrange
      model.getOrders.mockResolvedValue({ orders: [] });

      // Assert
      await expect(service.updateStatus(buildOptions())).rejects.toThrow(
        'Order not found'
      );
      expect(model.updateStatusOrder).toHaveBeenCalledTimes(0);
      expect(redis.clearCache).toHaveBeenCalledTimes(0);
    });

    test('should return order id when updated', async () => {
      // Arrange
      model.getOrders.mockResolvedValue({
        orders: [{ id: 'some_uuid_order' }],
      });
      model.updateStatusOrder.mockResolvedValue({ id: 'some_uuid_order' });

      // Assert
      await expect(service.updateStatus(buildOptions())).resolves.toEqual();
      expect(redis.clearCache).toHaveBeenCalledWith(['order', 'orders']);
    });
  });
});
