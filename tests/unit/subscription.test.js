const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/User");
const SubscriptionPlan = require("../../src/models/SubscriptionPlan");
const UserSubscription = require("../../src/models/UserSubscription");

let token;
let userId;
let planId;

beforeAll(async () => {
  const testDbUri =
    process.env.MONGODB_TEST_URI ||
    "mongodb://localhost:27017/streaming_platform_test";
  await mongoose.connect(testDbUri);
});

beforeEach(async () => {
  // Clear collections
  await User.deleteMany({});
  await SubscriptionPlan.deleteMany({});
  await UserSubscription.deleteMany({});

  // Create test user and get token
  const userResponse = await request(app).post("/api/v1/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "Test@123456",
  });

  token = userResponse.body.data.token;
  userId = userResponse.body.data.user.id;

  // Create test plan
  const plan = await SubscriptionPlan.create({
    name: "Test Premium",
    description: "Test premium plan",
    price: 14.99,
    currency: "USD",
    validityDays: 30,
    accessLevel: "Premium",
    maxDevicesAllowed: 4,
    maxConcurrentStreams: 2,
    resolution: "1080p",
    features: ["HD streaming", "Multiple devices"],
    isActive: true,
  });

  planId = plan._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Subscription Plans Tests", () => {
  describe("GET /api/v1/subscriptions/plans", () => {
    it("should get all active plans without authentication", async () => {
      const response = await request(app)
        .get("/api/v1/subscriptions/plans")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.plans)).toBe(true);
    });

    it("should filter plans by access level", async () => {
      const response = await request(app)
        .get("/api/v1/subscriptions/plans?accessLevel=Premium")
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.plans.forEach((plan) => {
        expect(plan.accessLevel).toBe("Premium");
      });
    });
  });

  describe("GET /api/v1/subscriptions/plans/:planId", () => {
    it("should get plan details by ID", async () => {
      const response = await request(app)
        .get(`/api/v1/subscriptions/plans/${planId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.name).toBe("Test Premium");
    });

    it("should return 404 for non-existent plan", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/subscriptions/plans/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

describe("User Subscriptions Tests", () => {
  describe("POST /api/v1/subscriptions/subscribe", () => {
    it("should subscribe user to a plan", async () => {
      const response = await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({
          planId: planId,
          autoRenew: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.plan.name).toBe("Test Premium");
      expect(response.body.data.subscription.status).toBe("active");
    });

    it("should not allow duplicate active subscriptions", async () => {
      // First subscription
      await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId });

      // Try second subscription
      const response = await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        "already have an active subscription"
      );
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .send({ planId })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should validate plan ID", async () => {
      const response = await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId: "invalid-id" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/subscriptions/status", () => {
    it("should get current subscription status", async () => {
      // Create subscription first
      await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId });

      const response = await request(app)
        .get("/api/v1/subscriptions/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.status).toBe("active");
    });

    it("should return null for no active subscription", async () => {
      const response = await request(app)
        .get("/api/v1/subscriptions/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeNull();
    });
  });

  describe("GET /api/v1/subscriptions/history", () => {
    it("should get subscription history", async () => {
      // Create subscription
      await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId });

      const response = await request(app)
        .get("/api/v1/subscriptions/history")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.subscriptions)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/v1/subscriptions/history?page=1&limit=5")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe("PUT /api/v1/subscriptions/cancel", () => {
    it("should cancel active subscription", async () => {
      // Create subscription
      await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId });

      const response = await request(app)
        .put("/api/v1/subscriptions/cancel")
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Too expensive" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.status).toBe("cancelled");
      expect(response.body.data.subscription.autoRenew).toBe(false);
    });

    it("should return 404 if no active subscription", async () => {
      const response = await request(app)
        .put("/api/v1/subscriptions/cancel")
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Test" })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

describe("Admin Plan Management Tests", () => {
  let adminToken;

  beforeEach(async () => {
    // Create admin user
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "Admin@123456",
      role: "admin",
    });

    adminToken = admin.generateAuthToken();
  });

  describe("POST /api/v1/subscriptions/plans", () => {
    it("should allow admin to create plan", async () => {
      const planData = {
        name: "Ultimate",
        description: "Ultimate plan",
        price: 19.99,
        validityDays: 30,
        accessLevel: "Ultimate",
        maxDevicesAllowed: 6,
        maxConcurrentStreams: 4,
        resolution: "4K",
      };

      const response = await request(app)
        .post("/api/v1/subscriptions/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(planData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.name).toBe("Ultimate");
    });

    it("should not allow regular user to create plan", async () => {
      const response = await request(app)
        .post("/api/v1/subscriptions/plans")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Test",
          description: "Test",
          price: 9.99,
          validityDays: 30,
          accessLevel: "Basic",
          maxDevicesAllowed: 1,
          maxConcurrentStreams: 1,
          resolution: "720p",
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/subscriptions/plans/:planId", () => {
    it("should allow admin to update plan", async () => {
      const response = await request(app)
        .put(`/api/v1/subscriptions/plans/${planId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ price: 12.99 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.price).toBe(12.99);
    });
  });

  describe("DELETE /api/v1/subscriptions/plans/:planId", () => {
    it("should not delete plan with active subscriptions", async () => {
      // Create subscription
      await request(app)
        .post("/api/v1/subscriptions/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ planId });

      const response = await request(app)
        .delete(`/api/v1/subscriptions/plans/${planId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("active subscriptions");
    });
  });
});
