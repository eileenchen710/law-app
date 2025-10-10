const { Schema, model, models } = require("mongoose");

const ServiceSchema = new Schema(
  {
    firm_ids: {
      type: [Schema.Types.ObjectId],
      ref: 'Firm',
      default: [],
    },
    // 保留旧字段以支持向后兼容
    firm_id: {
      type: Schema.Types.ObjectId,
      ref: 'Firm',
    },
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
    price: {
      type: Number,
      min: 0,
    },
    lawyerInfo: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      default: 'active',
      trim: true,
    },
    available_times: {
      type: [Date],
      default: [],
    },
  },
  {
    collection: "services",
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.Service || model("Service", ServiceSchema);
