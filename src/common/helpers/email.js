const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: +process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (options) => {
  await transporter.sendMail({
    from: '"POS System" <noreply@pos.com>',
    to: options.email,
    subject: options.subject,
    html: options.html
  });
};

module.exports = sendEmail;