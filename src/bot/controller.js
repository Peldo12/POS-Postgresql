const service = require("./service");
const { message } = require("telegraf/filters");

function start(assist) {
  assist.start(async (ctx) => {
    const payload = ctx.startPayload;
    if (payload) {
      try {
        const result = await service.byId(payload);
        if (!result) return ctx.reply("File not found");

        ctx.reply("Wait a second ...");
        await ctx.replyWithDocument(result.file_id);
      } catch (error) {
        console.error(error);
        ctx.reply("Internal server problem");
      }
    } else {
      ctx.reply("Welcome, this is your personal cloud storage!");
    }
  });
}

function text(assist) {
  assist.on(message("text"), async (ctx) => {
    // optional(explicit) await ctx.telegram.sendMessage(ctx.message.chat.id, )
    if (ctx.text === "sapa") return await ctx.reply("Am i from conditional?");

    const result = await service.answer(ctx.text);
    await ctx.reply(result);
  });
}

function document(assist) {
  assist.on("document", async (ctx) => {
    const fileId = ctx.message.document.file_id;
    const fileName = ctx.message.document.file_name;
    const type = ctx.message.document.mime_type;
    const fileSize = ctx.message.document.file_size;
    const userName = ctx.message.from.username;
    const botName = ctx.botInfo.username;

    const result = await service.create({
      fileId,
      fileName,
      type,
      fileSize,
      userName,
    });

    const link = `https://t.me/${botName}?start=${result}`;
    ctx.reply(
      `File document uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nDownload:\n${link}`,
    );
  });
}

module.exports = { text, start, document };
