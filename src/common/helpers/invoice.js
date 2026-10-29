const model = require('./model');

async function getNextInvoice() {
  const sequence = await model.getSequence();
  return formatInvoice(sequence);
}

function formatInvoice(sequence) {
  if (!sequence) throw new Error('No sequence');
  if (typeof sequence !== 'number') throw new Error('Wrong type');

  const now = new Date().toISOString().split('T')[0].replace(/-/g, '');

  return `POS-${now}-${String(sequence).padStart(6, '0')}`;
}

module.exports = { getNextInvoice, formatInvoice };
