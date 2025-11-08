const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide content title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide content description"],
    },
    type: {
      type: String,
      enum: ["movie", "series", "documentary"],
      required: [true, "Please specify content type"],
    },
    genre: [
      {
        type: String,
        required: [true, "Please provide at least one genre"],
      },
    ],
    releaseYear: {
      type: Number,
      required: [true, "Please provide release year"],
    },
    duration: {
      type: Number, // Duration in minutes
      required: [true, "Please provide content duration"],
    },
    rating: {
      type: String,
      enum: ["G", "PG", "PG-13", "R", "NC-17"],
      required: [true, "Please provide content rating"],
    },
    cast: [
      {
        name: String,
        role: String,
      },
    ],
    director: {
      type: String,
      required: [true, "Please provide director name"],
    },
    language: {
      type: String,
      required: [true, "Please provide content language"],
    },
    subtitles: [
      {
        type: String,
      },
    ],
    thumbnailUrl: {
      type: String,
      required: [true, "Please provide thumbnail URL"],
    },
    videoUrl: {
      type: String,
      required: [true, "Please provide video URL"],
    },
    trailerUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    qualityLevels: [
      {
        type: String,
        enum: ["SD", "HD", "4K"],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
contentSchema.index({ title: "text", description: "text" });
contentSchema.index({ genre: 1 });
contentSchema.index({ type: 1 });
contentSchema.index({ releaseYear: -1 });

module.exports = mongoose.model("Content", contentSchema);
