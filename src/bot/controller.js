const service = require('./service');
const { message } = require('telegraf/filters');

function start(assist) {
  assist.start(async ctx => {
    const payload = ctx.startPayload;
    if (payload) {
      try {
        const result = await service.byId(payload);
        if (!result) return ctx.reply('File not found');
        if (result.uploaded_by !== ctx.from.id)
          return ctx.reply('Sorry, your not belong this document');

        ctx.reply('Wait a second ...');
        await ctx.replyWithDocument(result.file_id);
      } catch (error) {
        ctx.reply('Internal server problem');
      }
    } else {
      ctx.reply('Welcome, this is your personal cloud storage!');
    }
  });
}

function text(assist) {
  assist.on(message('text'), async ctx => {
    // optional(explicit) await ctx.telegram.sendMessage(ctx.message.chat.id, )
    if (ctx.text === 'sapa') return await ctx.reply('Hello World !');
    await ctx.sendChatAction('typing');

    const result = await service.answer(ctx.text);
    await ctx.reply(result);
  });
}

function document(assist) {
  assist.on('document', async ctx => {
    const document = ctx.message.document;

    const channelChat = await ctx.telegram.sendDocument(
      process.env.CHANNEL_ID,
      document.file_id
    );
    const fileId = channelChat.document.file_id;
    const fileName = document.file_name;
    const type = document.mime_type;
    const fileSize = document.file_size;
    const userId = ctx.message.from.id;
    const botName = ctx.botInfo.username;

    try {
      const result = await service.create({
        fileId,
        fileName,
        type,
        fileSize,
        userId
      });

      const link = `https://t.me/${botName}?start=${result}`;
      await ctx.telegram.editMessageCaption(
        process.env.CHANNEL_ID,
        channelChat.message_id,
        null,
        `Uploader: ${userId}\nFile: ${fileName}\nLink: ${link}`
      );

      ctx.reply(
        `File document uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nDownload:\n${link}`
      );
    } catch (error) {
      ctx.reply('Error on saving the document, sorry ...');
    }
  });
}

function image(assist) {
  assist.on('images', async (ctx) => {
    ctx.reply('Masuk')
    console.log(ctx)
  })
}

module.exports = { text, start, document };
