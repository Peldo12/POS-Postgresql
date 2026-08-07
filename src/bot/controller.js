const service = require("./service");
const { message } = require("telegraf/filters");

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

    await service.create({
      fileId,
      fileName,
      type,
      fileSize,
      userName,
    });
    ctx.reply(
      `File document uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nFile ID:\n${fileId}`,
    );
  });
}

module.exports = { text, document };
