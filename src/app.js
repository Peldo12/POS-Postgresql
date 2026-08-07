const express = require("express");
const app = express();
const logger = require("./common/middleware/logger");
const cors = require("cors");
const initDB = require("./config/initDB");
initDB();

app.use(express.json());
// app.use(express.static("/public/upload"))
app.use(cors());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.use((req, res, next) => {
  req.logger = logger;
  next();
});

app.use(require("./common/middleware/httpLogger"));

app.use("/api/auth", require("./auth/route"));
app.use("/api/user", require("./user/route"));
app.use("/api/product", require("./product/route"));
app.use("/api/order", require("./order/route"));
// app.use("/api/trash", require('./routes/trash'))
app.use("/api/category", require("./category/route"));

app.use(require("./common/middleware/notFound"));
app.use(require("./common/middleware/globalError"));

module.exports = app;
