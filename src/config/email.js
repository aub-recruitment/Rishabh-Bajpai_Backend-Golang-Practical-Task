const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

/**
 * Email configuration and transporter setup
 */
const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
};

// Create reusable transporter
let transporter = null;

const createTransporter = () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn(
        "Email credentials not configured. Email service will be disabled."
      );
      return null;
    }

    transporter = nodemailer.createTransport(emailConfig);

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        logger.error(`Email transporter verification failed: ${error.message}`);
      } else {
        logger.info("Email transporter is ready to send messages");
      }
    });

    return transporter;
  } catch (error) {
    logger.error(`Error creating email transporter: ${error.message}`);
    return null;
  }
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

module.exports = {
  emailConfig,
  getTransporter,
  createTransporter,
};
