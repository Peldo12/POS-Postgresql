function buildUsersFilter(filters) {
  const { id, role, search, range, type, deleted } = filters;
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (id) {
    params.push(id);
    whereClause += `
    AND u.id = $${params.length}`;
  }

  if (role) {
    params.push(role);
    whereClause += `
    AND r.name = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);

    whereClause += `
    AND (
      u.id ILIKE $${params.length}
      OR u.username ILIKE $${params.length}
    )`;
  }

  if (range) {
    switch (range) {
      case 'today':
        whereClause += `
        AND u.created_at >= CURRENT_DATE
        AND u.created_at < CURRENT_DATE + INTERVAL '1 day'`;
        break;

      case 'week':
        whereClause += `
        AND u.created_at >= DATE_TRUNC('week', CURRENT_DATE)
        AND u.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
        break;

      case 'month':
        whereClause += `
        AND u.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        AND u.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' `;
        break;

      case 'year':
        whereClause += `
        AND u.created_at >= DATE_TRUNC('year', CURRENT_DATE)
        AND u.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'`;
        break;
    }
  }

  if (deleted) {
    whereClause += `
    AND u.deleted_at IS NULL`;
  } else {
    whereClause += `
    AND u.deleted_at IS NOT NULL`;
  }

  params.push(type);
  whereClause += `
  AND t.type = $${params.length}`;

  return { whereClause, params };
}

module.exports = { buildUsersFilter };
