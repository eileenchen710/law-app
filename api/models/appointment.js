const { Schema, model, models } = require("mongoose");

const AppointmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
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
