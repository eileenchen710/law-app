﻿const { Schema, model, models } = require("mongoose");

const LawyerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    specialties: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const FirmSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    contact_email: {
      type: String,
      trim: true,
    },
    contact_phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    practiceAreas: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    lawyers: {
      type: [LawyerSchema],
      default: [],
    },
    available_times: {
      type: [Date],
      default: [],
    },
    services: {
      type: [String],
      default: [],
    },
    practice_areas: {
      type: [String],
      default: [],
    },
    price: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.8,
    },
    cases: {
      type: Number,
      min: 0,
      default: 0,
    },
    recommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "firms",
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.Firm || model("Firm", FirmSchema);
