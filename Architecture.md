# Streaming Platform Architecture

## Setup Instructions

### Prerequisites

- Node.js v18+ and npm
- MongoDB v6+
- Redis v7+

### Installation

1. **Clone and Install**

```bash
git clone <repository-url>
cd streaming-platform
npm install
```

2. **Environment Setup**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Services**

```bash
# Terminal 1: MongoDB
mongod --dbpath /path/to/data/db

# Terminal 2: Redis
redis-server

# Terminal 3: Application
npm run dev
```

4. **Seed Initial Data**

```bash
npm run seed
```

### API Access

- Base URL: `http://localhost:3000/api/v1`
- API Documentation: Available in `docs/API.md`

## Architecture Overview

This is a production-grade streaming platform backend built with Node.js, Express, MongoDB, and Redis. The architecture follows industry best practices with a clear separation of concerns, scalable design patterns, and robust security measures.

### Core Architecture

**Layered Architecture Pattern:**

- **Routes Layer**: Handles HTTP requests, input validation, and routing
- **Middleware Layer**: Authentication, authorization, rate limiting, error handling
- **Controller Layer**: Business logic orchestration, request/response handling
- **Service Layer**: Reusable business logic, external integrations
- **Model Layer**: Data schemas, validation, database interactions
- **Events Layer**: Asynchronous notifications, background jobs

**Key Design Decisions:**

1. **Mongoose ODM**: Chosen for schema validation, middleware hooks, and rich query capabilities. Provides data integrity and relationship management out of the box.

2. **JWT Authentication**: Stateless authentication allowing horizontal scaling. Tokens contain minimal user context, with full user data fetched per request for security.

3. **Redis Integration**:

   - Session management for concurrent stream tracking
   - Rate limiting with distributed state
   - Caching layer for frequently accessed data
   - Pub/Sub for real-time features

4. **Event-Driven Notifications**: Node.js EventEmitter pattern for decoupled notification system. Subscription events trigger email notifications without blocking the main request flow.

5. **Flexible Access Control**: Hierarchical subscription model (Free → Basic → Premium → Ultimate) where higher tiers inherit lower tier access, implemented at the database query level for performance.

## Think Piece Responses

### 1. Scalable Architecture Components

**Independently Scalable Services:**

- **API Servers (Stateless)**:

  - Horizontally scale behind load balancer
  - No session state; all auth via JWT
  - Deploy with Kubernetes HPA based on CPU/memory
  - Target: 1000+ requests/sec per instance

- **Database Layer (MongoDB)**:

  - Replica sets for read scaling (3+ nodes)
  - Sharding strategy: Shard by `userId` for user data, `contentId` for watch history
  - Separate collections for hot (recent watches) and cold data (historical)
  - Read preferenc e: primaryPreferred for critical writes, secondaryPreferred for analytics

- **Caching Layer (Redis)**:

  - Redis Cluster for distributed caching
  - Cache subscription status (5min TTL), content metadata (1hr TTL)
  - Separate Redis instances for sessions vs cache to prevent eviction conflicts
  - Estimated cache hit ratio: 85%+

- **Media Delivery (CDN)**:

  - Separate from API servers entirely
  - CloudFront/Cloudflare for video delivery
  - Pre-signed URLs with time-limited access
  - Multi-region edge caching

- **Background Workers**:
  - Separate Node.js processes for email notifications
  - Bull queue with Redis backend for job management
  - Auto-scale based on queue length
  - Idempotent job processing for retry safety

**Scaling Strategy:**

```
Initial: 2 API servers, 3-node MongoDB replica, 1 Redis
10K users: 5 API servers, 5-node MongoDB with sharding, 3-node Redis cluster
100K users: 20 API servers across regions, sharded MongoDB cluster, Redis cluster with sentinels
```

### 2. Watch History & Analytics Partitioning

**Time-Based Partitioning Strategy:**

```javascript
// Collection structure
watch_history_2025_01; // Current month - hot data
watch_history_2024_12; // Previous month
watch_history_archive; // >6 months old
```

**Implementation:**

- **Hot Data** (0-30 days): Primary MongoDB collection, indexed on userId + lastWatchedAt
- **Warm Data** (30-180 days): Separate collection, reduced indexes, queried less frequently
- **Cold Data** (180+ days): Archived to S3 in Parquet format, queried via Athena/BigQuery

**Partitioning Logic:**

```javascript
// Automatic partitioning in background job
const collectionName = `watch_history_${year}_${month}`;
db.collection(collectionName).createIndex({ user: 1, lastWatchedAt: -1 });
```

**Benefits:**

- Faster queries on recent data (90% of queries hit last 30 days)
- Reduced index size and memory footprint
- Cost-effective storage (S3 is 1/10th MongoDB Atlas cost)
- TTL indexes on hot collections for auto-cleanup

**Analytics Aggregation:**

- Daily batch job aggregates watch history into summary tables
- Pre-computed metrics: total watch time, completion rates, popular content
- Store aggregates in separate analytics database (PostgreSQL/BigQuery)
- Reduces need to query raw watch history

**Data Lifecycle:**

```
Day 0-30: MongoDB hot collection (full indexes)
Day 31-180: MongoDB warm collection (basic indexes)
Day 181+: S3 Parquet files (queryable via data warehouse)
```

### 3. Video Storage & Bandwidth Cost Optimization

**Multi-Tier Storage Strategy:**

**Tier 1: Popular Content (Top 20%)**

- Store on CDN edge locations (CloudFront, Fastly)
- Multiple bitrate versions (adaptive streaming)
- Cost: $0.085/GB transfer, but 80% of views
- ROI: High due to cache hit rates

**Tier 2: Regular Content**

- Origin storage: S3 Standard
- CDN pull-through cache with 7-day TTL
- Cost: $0.023/GB storage + $0.09/GB transfer
- 70% cache hit rate on CDN

**Tier 3: Archive/Long-tail Content**

- S3 Intelligent-Tiering (auto-moves to cheaper tiers)
- Infrequent Access tier: $0.0125/GB
- Glacier for content not viewed in 90 days: $0.004/GB
- First-request latency accepted (minutes)

**Encoding Optimization:**

```javascript
// Adaptive bitrate encoding
const qualities = [
  { resolution: "480p", bitrate: "800kbps", tier: "Basic" },
  { resolution: "720p", bitrate: "2.5Mbps", tier: "Premium" },
  { resolution: "1080p", bitrate: "5Mbps", tier: "Premium" },
  { resolution: "4K", bitrate: "20Mbps", tier: "Ultimate" },
];
```

**Bandwidth Reduction Techniques:**

1. **Adaptive Streaming (HLS/DASH)**:

   - Client requests quality based on bandwidth
   - 30-40% bandwidth savings vs fixed quality
   - Implementation: AWS MediaConvert → HLS manifest

2. **Compression Optimization**:

   - H.265 (HEVC) reduces bitrate by 50% vs H.264
   - Trade-off: Higher encoding cost, lower delivery cost
   - Break-even: Content viewed 3+ times

3. **P2P Delivery (WebRTC)**:

   - Implement for live streaming
   - 60% reduction in origin bandwidth
   - Use services like Peer5, Streamroot

4. **Smart Preloading**:

   - Buffer only 30 seconds ahead
   - 40% reduction vs full preload
   - Machine learning predicts user drop-off

5. **Geographic Routing**:
   - Regional CDN selection based on cost
   - Asia-Pacific: Alibaba Cloud CDN ($0.03/GB)
   - US/EU: CloudFront ($0.085/GB)
   - Latin America: Local CDNs ($0.04/GB)

**Cost Breakdown Example (100TB/month)**:

```
Without optimization:
Storage: 100TB × $0.023 = $2,300
Transfer: 500TB × $0.09 = $45,000
Total: $47,300/month

With optimization:
Storage: 50TB S3 Standard + 30TB IA + 20TB Glacier = $1,430
Transfer: 70% CDN cached = $31,500
Total: $32,930/month (30% savings)
```

### 4. Active Session Tracking

**Redis-Based Session Architecture:**

```javascript
// Session key structure
session:{userId}:{deviceId} = {
  contentId,
  startTime,
  lastHeartbeat,
  quality,
  bandwidth
}

// Concurrent streams counter
concurrent:{userId} = SET [deviceId1, deviceId2]
```

**Implementation:**

```javascript
// Start stream
async function startStream(userId, deviceId, contentId, subscription) {
  const concurrentKey = `concurrent:${userId}`;
  const activeStreams = await redis.sCard(concurrentKey);

  if (activeStreams >= subscription.plan.maxConcurrentStreams) {
    throw new Error("Maximum concurrent streams reached");
  }

  const sessionKey = `session:${userId}:${deviceId}`;
  await redis.setEx(
    sessionKey,
    3600,
    JSON.stringify({
      contentId,
      startTime: Date.now(),
      lastHeartbeat: Date.now(),
    })
  );

  await redis.sAdd(concurrentKey, deviceId);
  await redis.expire(concurrentKey, 3600);
}

// Heartbeat every 30 seconds
async function heartbeat(userId, deviceId) {
  const sessionKey = `session:${userId}:${deviceId}`;
  const session = await redis.get(sessionKey);

  if (session) {
    const data = JSON.parse(session);
    data.lastHeartbeat = Date.now();
    await redis.setEx(sessionKey, 3600, JSON.stringify(data));
  }
}

// Cleanup stale sessions (background job every 5 minutes)
async function cleanupStaleSessions() {
  const pattern = "session:*";
  const keys = await redis.keys(pattern);

  for (const key of keys) {
    const session = JSON.parse(await redis.get(key));
    const staleTime = Date.now() - session.lastHeartbeat;

    if (staleTime > 120000) {
      // 2 minutes no heartbeat
      const [, userId, deviceId] = key.split(":");
      await redis.sRem(`concurrent:${userId}`, deviceId);
      await redis.del(key);
    }
  }
}
```

**Benefits:**

- O(1) concurrent stream checks
- Automatic expiration (no cleanup needed)
- Distributed (works across API servers)
- Real-time enforcement

**Monitoring:**

```javascript
// Dashboard metrics
const metrics = {
  activeUsers: await redis.dbSize(),
  avgConcurrentStreams: await calculateAvg(),
  topStreamers: await redis.zRevRange("streaming:leaderboard", 0, 10),
};
```

### 5. Concurrent Streaming Limits Enforcement

**Multi-Layer Enforcement:**

**Layer 1: API Gateway (Pre-Stream Check)**

```javascript
// Before issuing stream token
router.post("/stream/start", protect, async (req, res) => {
  const { contentId, deviceId } = req.body;
  const subscription = await getActiveSubscription(req.user._id);

  // Check concurrent limit
  const activeStreams = await sessionService.getActiveStreams(req.user._id);

  if (activeStreams.length >= subscription.plan.maxConcurrentStreams) {
    return res.status(429).json({
      success: false,
      message: `Maximum ${subscription.plan.maxConcurrentStreams} concurrent streams allowed`,
      activeDevices: activeStreams.map((s) => s.deviceName),
    });
  }

  // Create session
  const sessionToken = await sessionService.createSession({
    userId: req.user._id,
    contentId,
    deviceId,
    maxConcurrent: subscription.plan.maxConcurrentStreams,
  });

  res.json({ success: true, sessionToken });
});
```

**Layer 2: CDN Edge (Token Validation)**

```javascript
// Lambda@Edge function on CloudFront
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const token = request.querystring.token;

  // Validate token and check concurrent limits
  const session = await validateSessionToken(token);

  if (!session.valid) {
    return {
      status: "403",
      body: "Invalid or expired session",
    };
  }

  return request; // Allow through
};
```

**Layer 3: Client Heartbeat**

```javascript
// Client-side (React/JavaScript)
setInterval(async () => {
  await fetch("/api/stream/heartbeat", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      sessionId,
      timestamp: Date.now(),
      playbackPosition: video.currentTime,
    }),
  });
}, 30000); // Every 30 seconds

// Server terminates session without heartbeat after 2 minutes
```

**Layer 4: Active Monitoring**

```javascript
// Background job every minute
async function enforceStreamingLimits() {
  const users = await UserSubscription.find({ status: "active" });

  for (const sub of users) {
    const sessions = await sessionService.getActiveStreams(sub.user);

    if (sessions.length > sub.plan.maxConcurrentStreams) {
      // Kill oldest session
      const oldestSession = sessions.sort(
        (a, b) => a.startTime - b.startTime
      )[0];

      await sessionService.terminateSession(oldestSession.id);

      // Notify user
      await notificationService.send(sub.user, {
        type: "STREAM_LIMIT_EXCEEDED",
        message: "A device was disconnected due to concurrent stream limit",
      });
    }
  }
}
```

**Graceful Degradation:**

```javascript
// If Redis is down, fall back to database
async function getActiveStreams(userId) {
  try {
    return await sessionService.getActiveStreamsRedis(userId);
  } catch (error) {
    logger.warn("Redis unavailable, falling back to database");
    // Query recent watch history (less accurate but works)
    return await WatchHistory.find({
      user: userId,
      status: "started",
      lastWatchedAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
    });
  }
}
```

**User Experience:**

```javascript
// Client notification when limit reached
{
  "success": false,
  "code": "CONCURRENT_LIMIT_EXCEEDED",
  "message": "You're already streaming on 2 devices",
  "actions": [
    {
      "label": "Stop streaming on Living Room TV",
      "action": "terminate_session",
      "sessionId": "xyz"
    },
    {
      "label": "Upgrade Plan",
      "action": "upgrade",
      "planId": "premium"
    }
  ]
}
```

## Technology Stack

**Core:**

- Node.js v18 (LTS) with Express.js v4
- MongoDB v6 with Mongoose ODM
- Redis v7 for caching and sessions

**Security:**

- JWT for stateless authentication
- bcryptjs for password hashing (12 rounds)
- Helmet.js for security headers
- express-mongo-sanitize for NoSQL injection prevention
- express-rate-limit with Redis store

**Testing:**

- Jest for unit and integration tests
- Supertest for API testing
- 80%+ code coverage target

**DevOps:**

- Winston for structured logging
- Morgan for HTTP request logging
- Compression middleware for response optimization
- CORS with configurable origins

## AI Tooling Usage

This project structure and boilerplate were created with assistance from Claude (Anthropic AI). AI was used for:

- Initial project structure generation
- Boilerplate code for models, controllers, and middleware
- Best practices research and architecture patterns
- Documentation generation

**Human oversight was applied for:**

- Business logic implementation
- Security considerations and validation
- Performance optimization decisions
- Testing strategy and actual test cases
- Database schema design based on real-world scaling needs

The architecture decisions and scaling strategies are based on industry experience and were reviewed/refined beyond AI suggestions to ensure production-readiness.

## Performance Targets

- API Response Time: p95 < 200ms
- Database Queries: p95 < 50ms
- Cache Hit Rate: > 85%
- Concurrent Users: 10,000+ per instance
- Video Start Time: < 2 seconds
- Availability: 99.9% uptime

## Security Measures

1. Password hashing with bcrypt (12 rounds)
2. JWT token expiration (7 days)
3. Account lockout after 5 failed login attempts
4. Rate limiting on all endpoints
5. Input validation and sanitization
6. NoSQL injection prevention
7. CORS configuration
8. Helmet.js security headers
9. Secure session management
10. Role-based access control

## Monitoring & Observability

Implement the following in production:

- Application Performance Monitoring (APM): New Relic, DataDog
- Error Tracking: Sentry
- Log Aggregation: ELK Stack or CloudWatch
- Metrics: Prometheus + Grafana
- Distributed Tracing: OpenTelemetry

## Future Enhancements

1. GraphQL API layer for flexible queries
2. WebSocket support for real-time features
3. Recommendation engine using machine learning
4. Content delivery optimization with ML
5. Social features (comments, ratings, sharing)
6. Offline download support
7. Parental controls
8. Multi-language support
9. Advanced analytics dashboard
10. Payment gateway integration
