const { getRedisClient } = require("../config/redis");
const logger = require("../utils/logger");
const crypto = require("crypto");

class SessionService {
  constructor() {
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MS) || 3600000; // 1 hour
  }

  /**
   * Create a new streaming session
   */
  async createSession({
    userId,
    contentId,
    deviceId,
    deviceName,
    deviceType,
    quality,
    maxConcurrent,
  }) {
    try {
      const redis = getRedisClient();
      const sessionId = `session_${Date.now()}_${crypto
        .randomBytes(8)
        .toString("hex")}`;
      const sessionKey = `session:${userId}:${deviceId}`;
      const concurrentKey = `concurrent:${userId}`;

      // Check concurrent limit
      const activeCount = await redis.sCard(concurrentKey);
      if (activeCount >= maxConcurrent) {
        throw new Error("Maximum concurrent streams reached");
      }

      // Create session data
      const sessionData = {
        sessionId,
        userId: userId.toString(),
        contentId: contentId.toString(),
        deviceId,
        deviceName: deviceName || "Unknown Device",
        deviceType: deviceType || "other",
        quality: quality || "720p",
        startTime: Date.now(),
        lastHeartbeat: Date.now(),
      };

      // Store session (expires in 1 hour)
      await redis.setEx(
        sessionKey,
        this.sessionTimeout / 1000,
        JSON.stringify(sessionData)
      );

      // Add to concurrent streams set
      await redis.sAdd(concurrentKey, deviceId);
      await redis.expire(concurrentKey, this.sessionTimeout / 1000);

      // Generate stream token
      const token = crypto.randomBytes(32).toString("hex");

      logger.info(`Session created: ${sessionId} for user ${userId}`);

      return {
        sessionId,
        token,
        expiresAt: new Date(Date.now() + this.sessionTimeout),
      };
    } catch (error) {
      // Fallback if Redis is unavailable
      logger.error(`Session creation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update session heartbeat
   */
  async heartbeat(userId, sessionId, data = {}) {
    try {
      const redis = getRedisClient();
      const pattern = `session:${userId}:*`;
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.sessionId === sessionId) {
            session.lastHeartbeat = Date.now();
            if (data.playbackPosition !== undefined) {
              session.playbackPosition = data.playbackPosition;
            }
            await redis.setEx(
              key,
              this.sessionTimeout / 1000,
              JSON.stringify(session)
            );
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error(`Heartbeat error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get active streams for a user
   */
  async getActiveStreams(userId) {
    try {
      const redis = getRedisClient();
      const pattern = `session:${userId}:*`;
      const keys = await redis.keys(pattern);

      const sessions = [];
      for (const key of keys) {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          // Check if session is still active (heartbeat within 2 minutes)
          if (Date.now() - session.lastHeartbeat < 120000) {
            sessions.push(session);
          } else {
            // Clean up stale session
            await this.terminateSession(userId, session.sessionId);
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error(`Get active streams error: ${error.message}`);
      return [];
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(userId, sessionId) {
    try {
      const redis = getRedisClient();
      const pattern = `session:${userId}:*`;
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.sessionId === sessionId) {
            // Remove from concurrent streams
            const concurrentKey = `concurrent:${userId}`;
            await redis.sRem(concurrentKey, session.deviceId);

            // Delete session
            await redis.del(key);

            logger.info(`Session terminated: ${sessionId}`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error(`Terminate session error: ${error.message}`);
      return false;
    }
  }

  /**
   * Cleanup stale sessions (background job)
   */
  async cleanupStaleSessions() {
    try {
      const redis = getRedisClient();
      const pattern = "session:*";
      const keys = await redis.keys(pattern);

      let cleaned = 0;
      for (const key of keys) {
        const sessionData = await redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const staleTime = Date.now() - session.lastHeartbeat;

          // Remove sessions with no heartbeat for 2 minutes
          if (staleTime > 120000) {
            const [, userId, deviceId] = key.split(":");
            await redis.sRem(`concurrent:${userId}`, deviceId);
            await redis.del(key);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} stale sessions`);
      }

      return cleaned;
    } catch (error) {
      logger.error(`Cleanup stale sessions error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get session count for monitoring
   */
  async getSessionStats() {
    try {
      const redis = getRedisClient();
      const pattern = "session:*";
      const keys = await redis.keys(pattern);

      const stats = {
        totalActiveSessions: keys.length,
        sessionsByUser: {},
      };

      for (const key of keys) {
        const [, userId] = key.split(":");
        stats.sessionsByUser[userId] = (stats.sessionsByUser[userId] || 0) + 1;
      }

      return stats;
    } catch (error) {
      logger.error(`Get session stats error: ${error.message}`);
      return { totalActiveSessions: 0, sessionsByUser: {} };
    }
  }
}

// Export singleton instance
module.exports = new SessionService();

// Start cleanup job (runs every 5 minutes)
if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    const sessionService = new SessionService();
    await sessionService.cleanupStaleSessions();
  }, parseInt(process.env.SESSION_CHECK_INTERVAL_MS) || 300000);
}
