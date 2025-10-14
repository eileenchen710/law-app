const { Schema, model, models } = require("mongoose");

const ConsultationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    service_name: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    preferred_time: {
      type: Date,
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'contacted', 'converted', 'cancelled'],
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    firm_id: {
      type: Schema.Types.ObjectId,
      ref: 'Firm',
      index: true
    },
    firm_name: {
      type: String,
      trim: true,
    },
    service_id: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      index: true
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "consultations",
    timestamps: true,
    versionKey: false,
  }
);

ConsultationSchema.index({ email: 1 });
ConsultationSchema.index({ phone: 1 });
ConsultationSchema.index({ status: 1 });
ConsultationSchema.index({ createdAt: -1 });

module.exports = models.Consultation || model("Consultation", ConsultationSchema);
