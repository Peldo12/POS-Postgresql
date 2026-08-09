function email(link) {
  return `
  <body>
    <h1>Welcome to POS API</h1>
    <p>Please verify your email</p>
    <p>
      Click here<a>${link}</a>    
    </p>
  </body>
  `;
}

module.exports = { email };
