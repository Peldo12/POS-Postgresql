require('dotenv').config({quiet: true})
const app = require('./app')
const port = process.env.PORT || 3040

app.listen(port, () => {
  console.log(`${new Date().toLocaleTimeString()}: Server started on ${port}`)
})
