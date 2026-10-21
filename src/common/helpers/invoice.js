const model = require('./model');

async function generateInvoice() {
  const now = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const sequence = await model.getSequence();

  return `POS-${now}-${String(sequence).padStart(6, '0')}`;
}

module.exports = generateInvoice;
