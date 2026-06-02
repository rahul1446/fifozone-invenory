const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const logger = require('../utils/logger');
const socketConfig = require('../config/socket');

class NotificationService {
  async createNotification(data) {
    const notification = new Notification(data);
    await notification.save();

    // Standard server logging
    logger.info(`[Notification] [${data.type}] ${data.title}: ${data.message}`);

    // Real-time broadcast to connected frontend clients
    try {
      const io = socketConfig.getIO();
      if (io) {
        io.emit('new_notification', notification);
      }
    } catch (err) {
      // Quiet fail if server is starting or socket is offline
    }

    // Trigger SMTP and Twilio WhatsApp dispatches for warnings & errors
    if (data.severity === 'error' || data.severity === 'warning') {
      await this.dispatchExternalAlerts(notification);
    }

    return notification;
  }

  async dispatchExternalAlerts(notification) {
    try {
      const usersToNotify = await User.find({ isActive: true });

      for (const user of usersToNotify) {
        // Send Email Alert
        if (user.receiveEmailAlerts && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          try {
            const transporter = nodemailer.createTransport({
              service: process.env.EMAIL_SERVICE || 'gmail',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
              }
            });

            await transporter.sendMail({
              from: `"Fifozone Alerts" <${process.env.EMAIL_USER}>`,
              to: user.email,
              subject: `[ALERT] Fifozone: ${notification.title}`,
              text: `${notification.message}\n\nLogged at: ${notification.createdAt}\nSeverity Level: ${notification.severity.toUpperCase()}`
            });
            logger.info(`Email dispatch successful to: ${user.email}`);
          } catch (smtpErr) {
            logger.error(`SMTP transmission failed for ${user.email}: ${smtpErr.message}`);
          }
        }

        // Send WhatsApp Alert
        if (user.receiveWhatsAppAlerts && user.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            await client.messages.create({
              body: `*FIFOZONE ALERT (${notification.severity.toUpperCase()})*\n\n${notification.title}\n\n${notification.message}`,
              from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
              to: `whatsapp:${user.phone}`
            });
            logger.info(`Twilio WhatsApp dispatch successful to: ${user.phone}`);
          } catch (twilioErr) {
            logger.error(`Twilio transmission failed for ${user.phone}: ${twilioErr.message}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed external notification dispatches: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();
