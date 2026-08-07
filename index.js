require("dotenv").config({ quiet: true });
const app = require("./src/app");
const bot = require("./src/config/bot");
const port = process.env.PORT || 3040;

app.listen(port, () => {
  console.log(`${new Date().toLocaleTimeString()}: Server started on ${port}`);
  bot.launch();
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
