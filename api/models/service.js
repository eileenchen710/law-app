const { Schema, model, models } = require("mongoose");

const ServiceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    lawyerInfo: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "services",
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.Service || model("Service", ServiceSchema);
