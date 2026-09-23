if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const app = require("./src/app");
const bot = require("./src/config/bot");
const port = process.env.PORT || 3040;

app.listen(port, () => {
  console.log(`${new Date().toLocaleTimeString()}: Server started on ${port}`);
  bot.launch();
});

const stopBot = async (signal) => {
  console.log(`Menerima ${signal}, menghentikan bot...`);
  await bot.stop(signal);
  process.exit(0);
};

process.once("SIGINT", () => stopBot("SIGINT"));
process.once("SIGTERM", () => stopBot("SIGTERM"));
