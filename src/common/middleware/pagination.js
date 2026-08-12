function metadata(page, limit, search = null, total) {
  const data = {
    page,
    limit,
    total
  }
  
  if (search) data.search = search
  return data
}

module.exports = metadata