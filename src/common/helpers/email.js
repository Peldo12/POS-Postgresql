const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: +process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ email, subject, html }) => {
  await transporter.sendMail({
    from: 'POS-API <noreply@pos.com>',
    to: email,
    subject,
    html,
  });
};

module.exports = sendEmail;
