require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const SubscriptionPlan = require("../src/models/SubscriptionPlan");
const Content = require("../src/models/Content");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB Connected");
  } catch (error) {
    console.error("✗ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seed...\n");

    // Clear existing data
    await User.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await Content.deleteMany({});
    console.log("✓ Cleared existing data\n");

    // Create Admin User
    const admin = await User.create({
      name: "Admin User",
      email: process.env.ADMIN_EMAIL || "admin@streamingplatform.com",
      password: process.env.ADMIN_PASSWORD || "Admin@123456",
      role: "admin",
      phone: "+1234567890",
      bio: "Platform Administrator",
      isActive: true,
      emailVerified: true,
    });
    console.log("✓ Created admin user:", admin.email);

    // Create Sample Users
    const user1 = await User.create({
      name: "John Doe",
      email: "john@example.com",
      password: "User@123456",
      phone: "+1234567891",
      bio: "Movie enthusiast",
      isActive: true,
      preferences: {
        genres: ["action", "sci-fi"],
        language: "en",
      },
    });

    const user2 = await User.create({
      name: "Jane Smith",
      email: "jane@example.com",
      password: "User@123456",
      phone: "+1234567892",
      bio: "Series binge-watcher",
      isActive: true,
      preferences: {
        genres: ["drama", "thriller"],
        language: "en",
      },
    });
    console.log("✓ Created sample users\n");

    // Create Subscription Plans
    const basicPlan = await SubscriptionPlan.create({
      name: "Basic",
      description:
        "Perfect for casual viewers. Enjoy quality content on a single device.",
      price: 9.99,
      duration: 30,
      features: [
        "HD streaming (720p)",
        "Watch on 1 device",
        "Unlimited content access",
        "Cancel anytime",
      ],
      maxDevices: 1,
      maxProfiles: 1,
      qualityLevel: "HD",
      isActive: true,
    });

    const premiumPlan = await SubscriptionPlan.create({
      name: "Premium",
      description:
        "Best value for families. Full HD streaming on multiple devices.",
      price: 14.99,
      duration: 30,
      features: [
        "Full HD streaming (1080p)",
        "Watch on 4 devices",
        "Watch on 2 screens simultaneously",
        "Download content for offline viewing",
        "Ad-free experience",
        "Priority customer support",
        "Cancel anytime",
      ],
      maxDevices: 4,
      maxProfiles: 2,
      qualityLevel: "HD",
      isActive: true,
    });

    const ultimatePlan = await SubscriptionPlan.create({
      name: "Ultimate",
      description:
        "Premium experience with 4K Ultra HD. Perfect for enthusiasts.",
      price: 19.99,
      duration: 30,
      features: [
        "4K Ultra HD streaming",
        "Watch on 6 devices",
        "Watch on 4 screens simultaneously",
        "Unlimited downloads",
        "Ad-free experience",
        "Early access to new releases",
        "Premium customer support",
        "Exclusive content",
        "Cancel anytime",
      ],
      maxDevices: 6,
      maxProfiles: 4,
      qualityLevel: "4K",
      isActive: true,
    });

    const freePlan = await SubscriptionPlan.create({
      name: "Free",
      description: "Try our platform with limited content access.",
      price: 0,
      duration: 365,
      features: [
        "SD streaming (480p)",
        "Limited content library",
        "Watch with ads",
        "Single device",
      ],
      maxDevices: 1,
      maxProfiles: 1,
      qualityLevel: "SD",
      isActive: true,
    });

    console.log(
      "✓ Created subscription plans:",
      [freePlan.name, basicPlan.name, premiumPlan.name, ultimatePlan.name].join(
        ", "
      )
    );
    console.log("\n");

    // Create Sample Content
    const movies = [
      {
        title: "The Great Adventure",
        description:
          "An epic journey through time and space. Follow our heroes as they embark on the adventure of a lifetime.",
        type: "movie",
        genre: ["action", "adventure", "sci-fi"],
        releaseYear: 2024,
        duration: 142,
        rating: "PG-13",
        videoUrl: "https://cdn.example.com/videos/great-adventure.m3u8",
        trailerUrl: "https://cdn.example.com/trailers/great-adventure.mp4",
        thumbnailUrl: "https://cdn.example.com/thumbnails/great-adventure.jpg",
        director: "Sarah Johnson",
        language: "en",
        subtitles: ["en", "es", "fr"],
        qualityLevels: ["SD", "HD", "4K"],
        isActive: true,
        cast: [
          { name: "Chris Evans", role: "lead" },
          { name: "Emily Watson", role: "lead" },
        ],
      },
      {
        title: "City Lights",
        description:
          "A heartwarming drama about love, loss, and redemption in the big city.",
        type: "movie",
        genre: ["drama", "romance"],
        releaseYear: 2024,
        duration: 118,
        rating: "PG-13",
        videoUrl: "https://cdn.example.com/videos/city-lights.m3u8",
        trailerUrl: "https://cdn.example.com/trailers/city-lights.mp4",
        thumbnailUrl: "https://cdn.example.com/thumbnails/city-lights.jpg",
        director: "David Martinez",
        language: "en",
        subtitles: ["en", "es"],
        qualityLevels: ["SD", "HD"],
        isActive: true,
        cast: [
          { name: "Mark Williams", role: "lead" },
          { name: "Sophie Lee", role: "lead" },
        ],
      },
      {
        title: "Mystery Island",
        description:
          "When a group of friends gets stranded on a mysterious island, they must uncover its secrets to survive.",
        type: "movie",
        genre: ["thriller", "mystery", "adventure"],
        releaseYear: 2024,
        duration: 135,
        rating: "PG-13",
        videoUrl: "https://cdn.example.com/videos/mystery-island.m3u8",
        trailerUrl: "https://cdn.example.com/trailers/mystery-island.mp4",
        thumbnailUrl: "https://cdn.example.com/thumbnails/mystery-island.jpg",
        director: "Lisa Anderson",
        language: "en",
        subtitles: ["en", "es", "fr"],
        qualityLevels: ["SD", "HD", "4K"],
        isActive: true,
        cast: [
          { name: "Tom Hardy", role: "lead" },
          { name: "Emma Stone", role: "lead" },
        ],
      },
      {
        title: "Comedy Central Special",
        description:
          "The funniest stand-up comedy special of the year. Laugh out loud with top comedians.",
        type: "movie",
        genre: ["comedy"],
        releaseYear: 2024,
        duration: 45,
        rating: "R",
        videoUrl: "https://cdn.example.com/videos/comedy-special.m3u8",
        trailerUrl: "https://cdn.example.com/trailers/comedy-special.mp4",
        thumbnailUrl: "https://cdn.example.com/thumbnails/comedy-special.jpg",
        director: "Tom Williams",
        language: "en",
        subtitles: ["en"],
        qualityLevels: ["SD", "HD"],
        isActive: true,
        cast: [{ name: "Jerry Smith", role: "performer" }],
      },
      {
        title: "Nature's Wonders",
        description:
          "A breathtaking documentary exploring the most beautiful places on Earth.",
        type: "documentary",
        genre: ["documentary", "nature"],
        releaseYear: 2024,
        duration: 95,
        rating: "G",
        videoUrl: "https://cdn.example.com/videos/nature-wonders.m3u8",
        trailerUrl: "https://cdn.example.com/trailers/nature-wonders.mp4",
        thumbnailUrl: "https://cdn.example.com/thumbnails/nature-wonders.jpg",
        director: "Robert Green",
        language: "en",
        subtitles: ["en", "es", "fr", "de"],
        qualityLevels: ["SD", "HD", "4K"],
        isActive: true,
        cast: [{ name: "David Green", role: "narrator" }],
      },
    ];

    await Content.insertMany(movies);
    console.log("✓ Created sample content:", movies.length, "items\n");

    // Summary
    console.log("═══════════════════════════════════════════");
    console.log("✓ Database seeded successfully!");
    console.log("═══════════════════════════════════════════");
    console.log("\n📧 Login Credentials:");
    console.log("─────────────────────────────────────────");
    console.log("Admin:");
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: ${process.env.ADMIN_PASSWORD || "Admin@123456"}`);
    console.log("\nSample Users:");
    console.log(`  Email: john@example.com`);
    console.log(`  Password: User@123456`);
    console.log(`  Email: jane@example.com`);
    console.log(`  Password: User@123456`);
    console.log("\n📦 Created:");
    console.log(`  - ${await User.countDocuments()} users`);
    console.log(
      `  - ${await SubscriptionPlan.countDocuments()} subscription plans`
    );
    console.log(`  - ${await Content.countDocuments()} content items`);
    console.log("═══════════════════════════════════════════\n");
  } catch (error) {
    console.error("✗ Seed error:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("✓ Database connection closed");
    process.exit(0);
  }
};

// Run seed
connectDB().then(seedDatabase);
