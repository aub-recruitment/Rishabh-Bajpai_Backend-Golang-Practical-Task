const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Send email
  async sendEmail(options) {
    try {
      const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
      };

      const info = await this.transporter.sendMail(message);
      logger.info(`Email sent: ${info.messageId}`);

      return info;
    } catch (error) {
      logger.error(`Email sending failed: ${error.message}`);
      throw error;
    }
  }

  // Send subscription expiry notification
  async sendSubscriptionExpiryNotification(user, subscription) {
    const subject = "Your Subscription is Expiring Soon";
    const html = `
      <h1>Subscription Expiry Notice</h1>
      <p>Dear ${user.name},</p>
      <p>Your ${subscription.plan.name} subscription will expire on ${new Date(
      subscription.expiresAt
    ).toLocaleDateString()}.</p>
      <p>To continue enjoying our services without interruption, please renew your subscription.</p>
      <p>
        <a href="${
          process.env.CLIENT_URL
        }/subscriptions/renew" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Renew Now
        </a>
      </p>
      <p>Thank you for being a valued customer!</p>
    `;

    return this.sendEmail({
      email: user.email,
      subject,
      html,
    });
  }

  // Send new content notification
  async sendNewContentNotification(user, content) {
    const subject = "New Content Available in Your Favorite Genre";
    const html = `
      <h1>New Content Alert!</h1>
      <p>Dear ${user.name},</p>
      <p>We've just added new content that we think you'll love:</p>
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h2>${content.title}</h2>
        <p>${content.description}</p>
        <p><strong>Genre:</strong> ${content.genre.join(", ")}</p>
      </div>
      <p>
        <a href="${process.env.CLIENT_URL}/content/${
      content._id
    }" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Watch Now
        </a>
      </p>
    `;

    return this.sendEmail({
      email: user.email,
      subject,
      html,
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const subject = "Password Reset Request";
    const html = `
      <h1>Reset Your Password</h1>
      <p>Dear ${user.name},</p>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <p>
        <a href="${resetUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;

    return this.sendEmail({
      email: user.email,
      subject,
      html,
    });
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const subject = "Welcome to Streaming Platform";
    const html = `
      <h1>Welcome to Streaming Platform!</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for joining our streaming platform. We're excited to have you on board!</p>
      <p>Here's what you can do now:</p>
      <ul>
        <li>Browse our content library</li>
        <li>Check out our subscription plans</li>
        <li>Update your profile</li>
        <li>Start watching!</li>
      </ul>
      <p>
        <a href="${process.env.CLIENT_URL}/browse" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Start Exploring
        </a>
      </p>
    `;

    return this.sendEmail({
      email: user.email,
      subject,
      html,
    });
  }
}

module.exports = new EmailService();
