const express = require('express')
const app = express()
const logger = require('./middleware/logger')
const cors = require('cors')
const initDB = require('./config/initDB')
initDB()

app.use(express.json())
// app.use(express.static("/public/upload"))
app.use(cors())

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok"
  })
})

app.use((req ,res, next) => {
  req.logger = logger
  next()
})

app.use(require('./middleware/httpLogger'))

app.use("/api/auth", require('./routes/auth'))
app.use("/api/user", require('./routes/user'))
app.use("/api/product", require('./routes/product'))
app.use("/api/order", require('./routes/order'))
// app.use("/api/trash", require('./routes/trash'))
app.use("/api/category", require('./routes/category'))
// app.use("/api/statistic", require('./routes/statistic'))

app.use(require('./middleware/notFound'))
app.use(require('./middleware/globalError'))

module.exports = app