const EventEmitter = require("events");
const emailService = require("../services/emailService");
const logger = require("../utils/logger");

class SubscriptionEvents extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  setupListeners() {
    // Handle subscription created event
    this.on("subscription.created", async ({ user, subscription, plan }) => {
      try {
        await emailService.sendSubscriptionConfirmation(user.email, {
          name: user.name,
          planName: plan.name,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: plan.price,
        });
        logger.info(`Subscription confirmation email sent to ${user.email}`);
      } catch (error) {
        logger.error(
          `Error sending subscription confirmation email: ${error.message}`
        );
      }
    });

    // Handle subscription cancelled event
    this.on("subscription.cancelled", async ({ user, subscription }) => {
      try {
        await emailService.sendSubscriptionCancellation(user.email, {
          name: user.name,
          endDate: subscription.endDate,
        });
        logger.info(`Subscription cancellation email sent to ${user.email}`);
      } catch (error) {
        logger.error(
          `Error sending subscription cancellation email: ${error.message}`
        );
      }
    });

    // Handle subscription expiring soon event
    this.on(
      "subscription.expiring",
      async ({ user, subscription, daysLeft }) => {
        try {
          await emailService.sendSubscriptionExpiring(user.email, {
            name: user.name,
            endDate: subscription.endDate,
            daysLeft,
          });
          logger.info(`Subscription expiry reminder sent to ${user.email}`);
        } catch (error) {
          logger.error(
            `Error sending subscription expiry reminder: ${error.message}`
          );
        }
      }
    );

    // Handle subscription renewed event
    this.on("subscription.renewed", async ({ user, subscription, plan }) => {
      try {
        await emailService.sendSubscriptionRenewal(user.email, {
          name: user.name,
          planName: plan.name,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: plan.price,
        });
        logger.info(`Subscription renewal confirmation sent to ${user.email}`);
      } catch (error) {
        logger.error(
          `Error sending subscription renewal confirmation: ${error.message}`
        );
      }
    });
  }
}

module.exports = new SubscriptionEvents();
