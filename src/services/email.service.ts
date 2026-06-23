import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter;

const createTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }
  return transporter;
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@domainanda.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}`, { messageId: info.messageId });
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  await sendEmail({
    to: email,
    subject: 'Welcome to Rayan Admin',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now login to the admin panel.</p>
      <a href="${process.env.FRONTEND_URL}">Go to Admin Panel</a>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;
  
  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: `
      <h1>Reset Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `,
  });
};
