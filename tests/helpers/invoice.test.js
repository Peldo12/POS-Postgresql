const model = require('../../src/common/helpers/model');
const {
  getNextInvoice,
  formatInvoice,
} = require('../../src/common/helpers/invoice');

describe('Invoice Helper', () => {
  let invoice;
  beforeAll(async () => {
    jest.spyOn(model, 'getSequence').mockResolvedValue(21);
    const sequence = await model.getSequence();
    invoice = formatInvoice(sequence);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should return valid invoice prefix', () => {
    expect(typeof invoice).toBe('string');
    expect(invoice.endsWith('000021')).toBe(true);
    expect(invoice).toMatch(/^POS-\d{8}-\d{6}$/);
  });

  test('should throw error when no sequence', () => {
    expect(() => {
      formatInvoice();
    }).toThrow('No sequence');
  });

  test('should throw error when invalid type sequence', () => {
    expect(() => {
      formatInvoice('19');
    }).toThrow('Wrong type');
  });

  test('should throw when database failed', async () => {
    jest.spyOn(model, 'getSequence').mockRejectedValue(new Error());
    await expect(getNextInvoice()).rejects.toThrow();
  });
});
