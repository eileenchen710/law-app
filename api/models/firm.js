const { Schema, model, models } = require("mongoose");

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
      required: true,
      trim: true,
      unique: true,
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
  },
  {
    collection: "firms",
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.Firm || model("Firm", FirmSchema);
