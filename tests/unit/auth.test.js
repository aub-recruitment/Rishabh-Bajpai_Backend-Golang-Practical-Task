const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/models/User");

// Test database connection
beforeAll(async () => {
  const testDbUri =
    process.env.MONGODB_TEST_URI ||
    "mongodb://localhost:27017/streaming_platform_test";
  await mongoose.connect(testDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  await User.deleteMany({});
});

// Close database connection
afterAll(async () => {
  await mongoose.connection.close();
});

describe("Authentication Tests", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
        phone: "+1234567890",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.user.email).toBe("john@example.com");
      expect(response.body.data.user.name).toBe("John Doe");
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("should not register user with duplicate email", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
      };

      // Register first user
      await request(app).post("/api/v1/auth/register").send(userData);

      // Try to register with same email
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    it("should validate email format", async () => {
      const userData = {
        name: "John Doe",
        email: "invalid-email",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation errors");
    });

    it("should validate password strength", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "weak",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should require all mandatory fields", async () => {
      const userData = {
        email: "john@example.com",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    let user;

    beforeEach(async () => {
      // Create a user for login tests
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData);

      user = response.body.data.user;
    });

    it("should login with correct credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "Password123!",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe("john@example.com");
    });

    it("should not login with incorrect password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "WrongPassword123!",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should not login with non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "Password123!",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should lock account after multiple failed attempts", async () => {
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

      // Make multiple failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        await request(app).post("/api/v1/auth/login").send({
          email: "john@example.com",
          password: "WrongPassword",
        });
      }

      // Next attempt should return account locked
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "Password123!",
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("locked");
    });

    it("should reset login attempts on successful login", async () => {
      // Make a failed attempt
      await request(app).post("/api/v1/auth/login").send({
        email: "john@example.com",
        password: "WrongPassword",
      });

      // Successful login
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "Password123!",
        })
        .expect(200);

      // Check that login attempts were reset
      const userDoc = await User.findOne({ email: "john@example.com" });
      expect(userDoc.loginAttempts).toBe(0);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let token;

    beforeEach(async () => {
      // Register and login
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
      });

      token = response.body.data.token;
    });

    it("should get current user with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("john@example.com");
    });

    it("should not get user without token", async () => {
      const response = await request(app).get("/api/v1/auth/me").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Not authorized");
    });

    it("should not get user with invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/auth/change-password", () => {
    let token;

    beforeEach(async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
      });

      token = response.body.data.token;
    });

    it("should change password with valid current password", async () => {
      const response = await request(app)
        .put("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "NewPassword123!",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password changed successfully");

      // Verify can login with new password
      const loginResponse = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "NewPassword123!",
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it("should not change password with incorrect current password", async () => {
      const response = await request(app)
        .put("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "WrongPassword",
          newPassword: "NewPassword123!",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("incorrect");
    });

    it("should validate new password strength", async () => {
      const response = await request(app)
        .put("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "weak",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    let refreshToken;

    beforeEach(async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
      });

      refreshToken = response.body.data.refreshToken;
    });

    it("should refresh token with valid refresh token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it("should not refresh with invalid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "invalid-token" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
