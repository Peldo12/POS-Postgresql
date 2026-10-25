function buildSelectOrder(filters) {
  const { id } = filters;
  let selectClause = `
  SELECT 
    o.id, o.invoice_number, u.username,
    COUNT(i.id)::int AS total_items`;

  if (id) {
    selectClause += `
    , o.subtotal::int, o.discount::int, o.tax::int`;
  }

  return { selectClause };
}

function buildOrderFilter(filters) {
  const {
    search,
    method,
    status,
    range,
    date,
    start,
    end,
    id,
    deleted = false,
  } = filters;

  let whereClause = `WHERE o.deleted_at ${deleted ? 'IS NOT NULL' : 'IS NULL'}`;
  const params = [];

  if (id) {
    params.push(id);
    whereClause += ` AND o.id = $${params.length}::uuid`;
  }

  if (search) {
    params.push(`%${search}%`);

    whereClause += `
    AND (
      o.invoice_number ILIKE $${params.length}
      OR u.username ILIKE $${params.length}
    )`;
  }

  if (method) {
    params.push(method);
    whereClause += ` AND o.method = $${params.length}`;
  }

  if (status) {
    params.push(status);
    whereClause += ` AND o.payment_status = $${params.length}`;
  }

  if (range) {
    switch (range) {
      case 'today':
        whereClause += `
        AND o.created_at >= CURRENT_DATE
        AND o.created_at < CURRENT_DATE + INTERVAL '1 day'`;
        break;

      case 'week':
        whereClause += `
        AND o.created_at >= DATE_TRUNC('week', CURRENT_DATE)
        AND o.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
        break;

      case 'month':
        whereClause += `
        AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        AND o.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' `;
        break;

      case 'year':
        whereClause += `
        AND o.created_at >= DATE_TRUNC('year', CURRENT_DATE)
        AND o.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'`;
        break;
    }
  }

  if (date) {
    params.push(date);

    whereClause += `
    AND o.created_at >= $${params.length}::date
    AND o.created_at < $${params.length}::date + INTERVAL '1 day'`;
  }

  if (start) {
    params.push(start);

    whereClause += `
    AND o.created_at >= $${params.length}`;
  }

  if (end) {
    params.push(end);

    whereClause += `
    AND o.created_at <= $${params.length}::date + INTERVAL '1 day'`;
  }

  return { whereClause, params };
}

module.exports = { buildSelectOrder, buildOrderFilter };
