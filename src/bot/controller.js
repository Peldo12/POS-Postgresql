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
          return ctx.reply('Sorry, you do not belong to this document');

        ctx.reply('Wait a second ...');

        const mimeType = result.type || ''; 

        if (mimeType.startsWith('image/')) {
          await ctx.replyWithPhoto(result.file_id);    
        } else if (mimeType.startsWith('video/')) {
          await ctx.replyWithVideo(result.file_id);       
        } else {
          await ctx.replyWithDocument(result.file_id);
        }
      } catch (error) {
        console.error("Error at start command:", error);
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
    const userId = ctx.message.from.id;
    const botName = ctx.botInfo.username;

    let channelChat

    try {
      channelChat = await ctx.telegram.sendDocument(
        process.env.CHANNEL_ID,
        document.file_id
      );
      
      const fileId = channelChat.document.file_id;
      const fileName = document.file_name;
      const type = document.mime_type;
      const fileSize = document.file_size;
      
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
        `✅ Document uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nDownload:\n${link}`
      );
    } catch (error) {
      if (channelChat) {
        try {
          await ctx.telegram.deleteMessage(
            process.env.CHANNEL_ID,
            channelChat.message_id
          );
        } catch (deleteError) {
          console.error("Fail delete photo on channel:", deleteError);
        }
      }
      ctx.reply('❌ Error on saving the document, sorry ...');
    }
  });
}

function photo(assist) {
  assist.on('photo', async (ctx) => {
    const images = ctx.message.photo
    const highestImage = images[images.length - 1];

    const userId = ctx.message.from.id;
    const botName = ctx.botInfo.username;
    
    let channelChat
    try {
      channelChat = await ctx.telegram.sendPhoto(
      process.env.CHANNEL_ID,
      highestImage.file_id
      );

      const fileId = channelChat.photo[channelChat.photo.length - 1].file_id;
      const fileName = `IMG_${highestImage.file_unique_id}.jpg`;
      const type = 'image/jpeg';
      const fileSize = highestImage.file_size;
      
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
        `✅ Photo uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nDownload:\n${link}`
      );
    } catch (error) {
      if (channelChat) {
        try {
          await ctx.telegram.deleteMessage(
            process.env.CHANNEL_ID,
            channelChat.message_id
          );
        } catch (deleteError) {
          console.error("Fail delete photo on channel:", deleteError);
        }
      }  
      ctx.reply("❌ Error on saving the document, sorry ...");
      }
  })
}

module.exports = { text, start, document, photo };
