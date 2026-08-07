const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");

const assist = new Telegraf(process.env.BOT_SECRET);
assist.command("hi", (ctx) => {
  console.log(ctx);
  ctx.reply("Hello");
});
assist.start((ctx) =>
  ctx.reply("Welcome, this is your personal cloud storage!"),
);
assist.help((ctx) => ctx.reply("Send me a file"));

const control = require("../bot/controller");
control.document(assist);
control.text(assist);

module.exports = assist;
