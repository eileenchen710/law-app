// DEPRECATED: This model is no longer used by the application
// The application now uses the Consultation model instead
// This file is kept for backward compatibility with existing data
const { Schema, model, models } = require("mongoose");

const AppointmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    firm_id: {
      type: Schema.Types.ObjectId,
      ref: 'Firm',
      required: true,
    },
    service_id: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    appointment_time: {
      type: Date,
      required: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    },
    contact: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "appointments",
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.Appointment || model("Appointment", AppointmentSchema);
