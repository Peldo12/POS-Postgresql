const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");

const assist = new Telegraf(process.env.BOT_SECRET);
assist.command("hi", (ctx) => ctx.reply("Hello"));
assist.start((ctx) =>
  ctx.reply("Welcome, this is your personal cloud storage!"),
);
assist.help((ctx) => ctx.reply("Send me a sticker"));
assist.on(message("sticker"), (ctx) => ctx.reply("👍"));

assist.on("document", async (ctx) => {
  console.log(ctx)
  const fileId = ctx.message.document.file_id;
  const fileName = ctx.message.document.file_name;
  const fileSize = ctx.message.document.file_size;

  ctx.reply(
    `File uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nFile ID:\n${fileId}`,
  );
});

module.exports = assist;
