module.exports = async () => {
  const res = await fetch('http//127.0.0.1:3001/send/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.WA_GATEWAY,
    },
    body: {},
  });
  const data = await res.json();
  console.log(data);
};
