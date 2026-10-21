module.exports = async (options) => {
  const {
    url,
    method = 'GET',
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.WA_GATEWAY,
    },
    body = {},
  } = options;
  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  return await res.json();
};
