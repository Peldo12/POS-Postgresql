const service = require("./service");

function upload(assist) {
  return assist.on("document", async (ctx) => {
    const fileId = ctx.message.document.file_id;
    const fileName = ctx.message.document.file_name;
    const fileSize = ctx.message.document.file_size;

    ctx.reply(
      `File accepted!\n\nName: ${fileName}\nSize: ${fileSize} bytes\nFile ID:\n${fileId}`,
    );
  });
}

module.export = { upload };
