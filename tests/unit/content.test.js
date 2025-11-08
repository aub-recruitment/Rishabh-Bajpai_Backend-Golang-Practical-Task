const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/User");
const Content = require("../../src/models/Content");
const SubscriptionPlan = require("../../src/models/SubscriptionPlan");
const UserSubscription = require("../../src/models/UserSubscription");

let adminToken, userToken, userId, adminId, contentId, premiumPlanId;

beforeAll(async () => {
  const testDbUri =
    process.env.MONGODB_TEST_URI ||
    "mongodb://localhost:27017/streaming_platform_test";
  await mongoose.connect(testDbUri);
});

beforeEach(async () => {
  // Clear collections
  await User.deleteMany({});
  await Content.deleteMany({});
  await SubscriptionPlan.deleteMany({});
  await UserSubscription.deleteMany({});

  // Create admin user
  const admin = await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: "Admin@123",
    role: "admin",
  });
  adminId = admin._id;
  adminToken = admin.generateAuthToken();

  // Create regular user
  const user = await User.create({
    name: "Test User",
    email: "user@test.com",
    password: "User@123",
  });
  userId = user._id;
  userToken = user.generateAuthToken();

  // Create premium plan
  const premiumPlan = await SubscriptionPlan.create({
    name: "Premium",
    description: "Premium plan",
    price: 14.99,
    currency: "USD",
    validityDays: 30,
    accessLevel: "Premium",
    maxDevicesAllowed: 4,
    maxConcurrentStreams: 2,
    resolution: "1080p",
    isActive: true,
  });
  premiumPlanId = premiumPlan._id;

  // Create test content
  const content = await Content.create({
    title: "Test Movie",
    description: "A test movie description",
    type: "movie",
    genre: ["action", "sci-fi"],
    accessLevel: "Premium",
    duration: 120,
    releaseDate: new Date("2024-01-01"),
    ageRating: "PG-13",
    videoUrl: "https://example.com/video.mp4",
    thumbnailUrl: "https://example.com/thumb.jpg",
    director: "Test Director",
    language: "en",
    resolution: ["720p", "1080p"],
    isPublished: true,
    createdBy: adminId,
  });
  contentId = content._id;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Content Browsing Tests", () => {
  describe("GET /api/v1/content", () => {
    it("should get all published content without authentication", async () => {
      const response = await request(app).get("/api/v1/content").expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });

    it("should filter content by type", async () => {
      const response = await request(app)
        .get("/api/v1/content?type=movie")
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.content.forEach((item) => {
        expect(item.type).toBe("movie");
      });
    });

    it("should filter content by genre", async () => {
      const response = await request(app)
        .get("/api/v1/content?genre=action")
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.content.forEach((item) => {
        expect(item.genre).toContain("action");
      });
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/v1/content?page=1&limit=5")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it("should sort content by release date", async () => {
      const response = await request(app)
        .get("/api/v1/content?sortBy=releaseDate&order=desc")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });
  });

  describe("GET /api/v1/content/:contentId", () => {
    it("should get content details by ID", async () => {
      const response = await request(app)
        .get(`/api/v1/content/${contentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content.title).toBe("Test Movie");
      expect(response.body.data.content.type).toBe("movie");
    });

    it("should return 404 for non-existent content", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/content/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it("should not expose video URL for unauthenticated users without access", async () => {
      const response = await request(app)
        .get(`/api/v1/content/${contentId}`)
        .expect(200);

      expect(response.body.data.content.videoUrl).toBeUndefined();
    });

    it("should include recommendations", async () => {
      const response = await request(app)
        .get(`/api/v1/content/${contentId}`)
        .expect(200);

      expect(response.body.data.recommendations).toBeDefined();
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });
  });

  describe("GET /api/v1/content/featured", () => {
    it("should get featured content", async () => {
      // Mark content as featured
      await Content.findByIdAndUpdate(contentId, { isFeatured: true });

      const response = await request(app)
        .get("/api/v1/content/featured")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });
  });

  describe("GET /api/v1/content/trending", () => {
    it("should get trending content", async () => {
      // Mark content as trending
      await Content.findByIdAndUpdate(contentId, { isTrending: true });

      const response = await request(app)
        .get("/api/v1/content/trending")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });
  });
});

describe("Content Streaming Tests", () => {
  describe("POST /api/v1/content/:contentId/stream", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/v1/content/${contentId}/stream`)
        .send({ deviceId: "test-device" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should require active subscription", async () => {
      const response = await request(app)
        .post(`/api/v1/content/${contentId}/stream`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ deviceId: "test-device" })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("subscription");
    });

    it("should start stream with valid subscription", async () => {
      // Create active subscription
      await UserSubscription.create({
        user: userId,
        plan: premiumPlanId,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentDetails: {
          transactionId: "test-123",
          amount: 14.99,
          currency: "USD",
        },
      });

      const response = await request(app)
        .post(`/api/v1/content/${contentId}/stream`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          deviceId: "test-device",
          deviceName: "Test Device",
          deviceType: "desktop",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.streamUrl).toBeDefined();
      expect(response.body.data.sessionToken).toBeDefined();
    });

    it("should enforce access level restrictions", async () => {
      // Create basic plan subscription
      const basicPlan = await SubscriptionPlan.create({
        name: "Basic",
        description: "Basic plan",
        price: 9.99,
        currency: "USD",
        validityDays: 30,
        accessLevel: "Basic",
        maxDevicesAllowed: 1,
        maxConcurrentStreams: 1,
        resolution: "720p",
        isActive: true,
      });

      await UserSubscription.create({
        user: userId,
        plan: basicPlan._id,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentDetails: {
          transactionId: "test-456",
          amount: 9.99,
          currency: "USD",
        },
      });

      const response = await request(app)
        .post(`/api/v1/content/${contentId}/stream`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ deviceId: "test-device" })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("does not have access");
    });

    it("should require device ID", async () => {
      await UserSubscription.create({
        user: userId,
        plan: premiumPlanId,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .post(`/api/v1/content/${contentId}/stream`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/content/stream/heartbeat", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/v1/content/stream/heartbeat")
        .send({ sessionId: "test-session" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should accept heartbeat with valid session", async () => {
      const response = await request(app)
        .post("/api/v1/content/stream/heartbeat")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          sessionId: "test-session",
          timestamp: Date.now(),
          playbackPosition: 300,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe("Admin Content Management Tests", () => {
  describe("POST /api/v1/content", () => {
    it("should require admin role", async () => {
      const response = await request(app)
        .post("/api/v1/content")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "New Movie",
          description: "Description",
          type: "movie",
          genre: ["action"],
          accessLevel: "Basic",
          duration: 120,
          releaseDate: new Date(),
          ageRating: "PG-13",
          videoUrl: "https://example.com/video.mp4",
          thumbnailUrl: "https://example.com/thumb.jpg",
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it("should allow admin to create content", async () => {
      const response = await request(app)
        .post("/api/v1/content")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "New Movie",
          description: "A new movie description",
          type: "movie",
          genre: ["action", "adventure"],
          accessLevel: "Basic",
          duration: 120,
          releaseDate: new Date("2024-06-01"),
          ageRating: "PG-13",
          videoUrl: "https://example.com/new-video.mp4",
          thumbnailUrl: "https://example.com/new-thumb.jpg",
          director: "New Director",
          language: "en",
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content.title).toBe("New Movie");
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/v1/content")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Incomplete Movie",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/content/:contentId", () => {
    it("should allow admin to update content", async () => {
      const response = await request(app)
        .put(`/api/v1/content/${contentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Updated Movie Title",
          isFeatured: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content.title).toBe("Updated Movie Title");
      expect(response.body.data.content.isFeatured).toBe(true);
    });

    it("should not allow regular user to update content", async () => {
      const response = await request(app)
        .put(`/api/v1/content/${contentId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Hacked Title" })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/v1/content/:contentId", () => {
    it("should allow admin to delete content", async () => {
      const response = await request(app)
        .delete(`/api/v1/content/${contentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify content is deleted
      const deletedContent = await Content.findById(contentId);
      expect(deletedContent).toBeNull();
    });

    it("should not allow regular user to delete content", async () => {
      const response = await request(app)
        .delete(`/api/v1/content/${contentId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
