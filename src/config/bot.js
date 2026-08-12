const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

const assist = new Telegraf(process.env.BOT_SECRET);
assist.command('hi', ctx => {
  ctx.reply('Hello');
});

assist.help(ctx => ctx.reply('Send me a file'));

const control = require('../bot/controller');
control.start(assist);
control.text(assist);
control.document(assist);

module.exports = assist;
