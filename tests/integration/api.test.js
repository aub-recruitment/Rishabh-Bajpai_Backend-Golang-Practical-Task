const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/User");
const SubscriptionPlan = require("../../src/models/SubscriptionPlan");
const Content = require("../../src/models/Content");

let adminToken;
let userToken;
let testUser;
let testPlan;
let testContent;

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  // Create admin user
  const adminUser = await User.create({
    name: "Test Admin",
    email: "admin@test.com",
    password: "Admin@123456",
    role: "admin",
  });

  // Create regular user
  testUser = await User.create({
    name: "Test User",
    email: "user@test.com",
    password: "User@123456",
  });

  // Login and get tokens
  const adminResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@test.com", password: "Admin@123456" });
  adminToken = adminResponse.body.token;

  const userResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "user@test.com", password: "User@123456" });
  userToken = userResponse.body.token;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("Authentication API", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "New User",
        email: "newuser@test.com",
        password: "Test@123456",
        phone: "+1234567890",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toHaveProperty("email", "newuser@test.com");
    });

    it("should not register user with existing email", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Duplicate User",
        email: "user@test.com",
        password: "Test@123456",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "user@test.com",
        password: "User@123456",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
    });

    it("should not login with invalid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "user@test.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });
  });
});

describe("Subscription Plans API", () => {
  describe("POST /api/v1/subscription-plans", () => {
    it("should create a new plan when admin", async () => {
      const plan = {
        name: "Test Plan",
        price: 9.99,
        validity_days: 30,
        access_level: "Basic",
        max_devices_allowed: 1,
        resolution: "480p",
      };

      const res = await request(app)
        .post("/api/v1/subscription-plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(plan);

      expect(res.status).toBe(201);
      testPlan = res.body.data;
    });

    it("should not create plan without admin token", async () => {
      const plan = {
        name: "Test Plan 2",
        price: 14.99,
        validity_days: 30,
        access_level: "Premium",
        max_devices_allowed: 2,
        resolution: "1080p",
      };

      const res = await request(app)
        .post("/api/v1/subscription-plans")
        .set("Authorization", `Bearer ${userToken}`)
        .send(plan);

      expect(res.status).toBe(403);
    });
  });
});

describe("Content API", () => {
  describe("POST /api/v1/content", () => {
    it("should create new content when admin", async () => {
      const content = {
        title: "Test Content",
        description: "Test Description",
        genre: ["action"],
        duration: 120,
        access_level: "Basic",
      };

      const res = await request(app)
        .post("/api/v1/content")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(content);

      expect(res.status).toBe(201);
      testContent = res.body.data;
    });
  });

  describe("GET /api/v1/content", () => {
    it("should return public content without auth", async () => {
      const res = await request(app).get("/api/v1/content");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });
  });
});

describe("Watch History API", () => {
  describe("POST /api/v1/watch-history", () => {
    it("should create watch history for subscribed user", async () => {
      // First create a subscription for the user
      await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ planId: testPlan._id });

      const watchData = {
        content: testContent._id,
        watchedDuration: 30,
        status: "in-progress",
      };

      const res = await request(app)
        .post("/api/v1/watch-history")
        .set("Authorization", `Bearer ${userToken}`)
        .send(watchData);

      expect(res.status).toBe(201);
    });
  });

  describe("GET /api/v1/watch-history", () => {
    it("should get user watch history", async () => {
      const res = await request(app)
        .get("/api/v1/watch-history")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });
  });
});
