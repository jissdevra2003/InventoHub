import nodemailer from 'nodemailer'


// Lazy transporter — created on first use so that dotenv.config()
// in server.ts has already run and env vars are available.
let _transporter: nodemailer.Transporter | null = null;

export function getMailTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}