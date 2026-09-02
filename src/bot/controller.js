const service = require('./service');
const { message } = require('telegraf/filters');

function start(assist) {
  assist.start(async (ctx) => {
    const payload = ctx.startPayload;
    if (payload) {
      try {
        const result = await service.byId(payload);
        if (!result) return ctx.reply('File not found');
        if (+result.uploaded_by !== ctx.from.id)
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
        console.error('Error at start command:', error);
        ctx.reply('Internal server problem');
      }
    } else {
      ctx.reply('Welcome, this is your personal cloud storage!');
    }
  });
}

function text(assist) {
  assist.on(message('text'), async (ctx) => {
    // optional(explicit) await ctx.telegram.sendMessage(ctx.message.chat.id, )
    if (ctx.text === 'sapa') return await ctx.reply('Hello World !');
    await ctx.sendChatAction('typing');

    const result = await service.answer(ctx.text);
    await ctx.reply(result);
  });
}

function document(assist) {
  assist.on('document', async (ctx) => {
    const document = ctx.message.document;
    const userId = ctx.message.from.id;
    const botName = ctx.botInfo.username;

    let channelChat;

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
        userId,
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
          await service.reset(ctx, channelChat.message_id);
        } catch (deleteError) {
          console.error('Fail delete photo on channel:', deleteError);
        }
      }
      ctx.reply('❌ Error on saving the document, sorry ...');
    }
  });
}

function photo(assist) {
  assist.on('photo', async (ctx) => {
    const images = ctx.message.photo;
    const highestImage = images[images.length - 1];

    const userId = ctx.message.from.id;
    const botName = ctx.botInfo.username;

    let channelChat;
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
        userId,
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
          await service.reset({
            ctx,
            cloudId: channelChat.photo[channelChat.photo.length - 1].file_id,
            chatId: channelChat.message_id,
          });
        } catch (deleteError) {
          console.error('Fail delete photo on channel:', deleteError);
        }
      }
      ctx.reply('❌ Error on saving the document, sorry ...');
    }
  });
}

function multi(assist) {
  assist.on(['video', 'audio', 'voice', 'animation'], async (ctx) => {
    const msg = ctx.message;

    // 1. Variabel penampung dinamis
    let media;
    let sendMethod;
    let mediaCategory;

    // 2. Deteksi otomatis media apa yang dikirim user
    if (msg.video) {
      media = msg.video;
      sendMethod = 'sendVideo';
      mediaCategory = 'video';
    } else if (msg.audio) {
      media = msg.audio;
      sendMethod = 'sendAudio';
      mediaCategory = 'audio';
    } else if (msg.voice) {
      media = msg.voice;
      sendMethod = 'sendVoice';
      mediaCategory = 'voice';
    } else if (msg.animation) {
      media = msg.animation; // GIF masuknya ke animation
      sendMethod = 'sendAnimation';
      mediaCategory = 'animation';
    }

    const userName = msg.from.username || msg.from.first_name;
    const botName = ctx.botInfo.username;
    let channelChat;

    try {
      // 3. Eksekusi pengiriman ke Channel secara dinamis
      // Ini sama aja kayak nulis: ctx.telegram.sendVideo(...) atau sendAudio(...)
      channelChat = await ctx.telegram[sendMethod](
        process.env.CHANNEL_ID,
        media.file_id
      );

      // 4. Ambil ID baru dari Channel
      // Telegram akan menaruh objek balasan sesuai kategorinya (misal: channelChat.video.file_id)
      const fileId = channelChat[mediaCategory].file_id;

      // 5. Normalisasi Nama File dan Tipe
      // Voice note dan GIF biasanya nggak punya 'file_name' dari sananya, jadi kita rakit sendiri biar DB nggak error
      const fileName =
        media.file_name ||
        `${mediaCategory.toUpperCase()}_${media.file_unique_id}`;
      const type = media.mime_type || `${mediaCategory}/unknown`;
      const fileSize = media.file_size;

      // 6. Masuk database
      const result = await service.create({
        fileId,
        fileName,
        type,
        fileSize,
        userName,
      });

      const link = `https://t.me/${botName}?start=${result}`;

      // 7. Kasih caption di channel
      await ctx.telegram.editMessageCaption(
        process.env.CHANNEL_ID,
        channelChat.message_id,
        null,
        `Uploader: ${userName}\nFile: ${fileName}\nLink: ${link}`
      );

      ctx.reply(
        `✅ Multimedia (${mediaCategory}) successfuly uploaded!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nDownload:\n${link}`
      );
    } catch (error) {
      console.error(`Gagal upload ${mediaCategory}:`, error);

      // Rollback pembersihan channel
      if (channelChat) {
        try {
          await ctx.telegram.deleteMessage(
            process.env.CHANNEL_ID,
            channelChat.message_id
          );
        } catch (deleteError) {
          console.error('Gagal menghapus file nyangkut:', deleteError);
        }
      }

      ctx.reply(
        `❌ Error, failed to save ${mediaCategory} to database, cancelled.`
      );
    }
  });
}

function grup(assist) {
  // Siapkan penampungan sementara di luar fungsi bot
  const albumCache = new Map();

  assist.on(['photo', 'video', 'document'], async (ctx, next) => {
    const msg = ctx.message;

    // 1. Cek apakah ini bagian dari album? Kalau BUKAN, oper ke handler biasa (next)
    if (!msg.media_group_id) {
      return next();
    }

    const groupId = msg.media_group_id;
    const userName = msg.from.username || msg.from.first_name;
    const botName = ctx.botInfo.username;

    // 2. Kalau ini file pertama dari album tersebut, bikin 'ruang tunggu'
    if (!albumCache.has(groupId)) {
      albumCache.set(groupId, []);

      // 3. Set waktu tunggu (misal 2.5 detik) biar semua file masuk dulu
      setTimeout(async () => {
        const files = albumCache.get(groupId);
        albumCache.delete(groupId); // Bersihkan antrian

        ctx.reply(`Memproses album berisi ${files.length} file...`);

        let reportText = `✅ Album Berhasil Diupload!\n\n`;
        let mediaGroupData = [];
        let dbResults = [];

        try {
          // 4. Siapkan format untuk dikirim massal ke Channel (Gudang)
          for (const file of files) {
            let fileIdToForward, type;
            if (file.photo) {
              fileIdToForward = file.photo[file.photo.length - 1].file_id;
              type = 'photo';
            } else if (file.video) {
              fileIdToForward = file.video.file_id;
              type = 'video';
            } else if (file.document) {
              fileIdToForward = file.document.file_id;
              type = 'document';
            }

            mediaGroupData.push({ type: type, media: fileIdToForward });
          }

          // 5. Lempar massal ke Channel (pakai sendMediaGroup)
          const channelChats = await ctx.telegram.sendMediaGroup(
            process.env.CHANNEL_ID,
            mediaGroupData
          );

          // 6. Looping untuk simpan ke Database satu per satu
          for (let i = 0; i < files.length; i++) {
            const originalFile = files[i];
            const channelFile = channelChats[i];

            let fileId, fileName, mimeType, fileSize;

            if (originalFile.photo) {
              const highRes = originalFile.photo[originalFile.photo.length - 1];
              fileId = channelFile.photo[channelFile.photo.length - 1].file_id;
              fileName = `IMG_${highRes.file_unique_id}.jpg`;
              mimeType = 'image/jpeg';
              fileSize = highRes.file_size;
            } else if (originalFile.video) {
              fileId = channelFile.video.file_id;
              fileName =
                originalFile.video.file_name ||
                `VID_${originalFile.video.file_unique_id}.mp4`;
              mimeType = originalFile.video.mime_type;
              fileSize = originalFile.video.file_size;
            }

            // Masuk Database
            const resultUuid = await service.create({
              fileId,
              fileName,
              type: mimeType,
              fileSize,
              userName,
            });

            const link = `https://t.me/${botName}?start=${resultUuid}`;
            reportText += `📄 ${fileName}\n🔗 ${link}\n\n`;
          }

          // 7. Balas ke user dengan 1 pesan berisi semua link
          ctx.reply(reportText);
        } catch (error) {
          console.error('Gagal proses album:', error);
          ctx.reply(
            '❌ Waduh, sebagian atau seluruh file dalam album gagal diproses.'
          );
        }
      }, 2500); // Tunggu 2.5 detik
    }

    // 8. Masukkan file yang baru datang ke 'ruang tunggu'
    albumCache.get(groupId).push(msg);
  });
}
module.exports = { text, start, document, photo, multi, grup };
