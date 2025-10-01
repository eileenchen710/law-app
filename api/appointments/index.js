const { Types } = require("mongoose");
const connectToDatabase = require("../_lib/db");
const Appointment = require("../models/appointment");

function formatAppointment(document) {
  const { _id, name, contact, description, createdAt } = document;
  return {
    id: _id.toString(),
    name,
    contact,
    description,
    createdAt,
  };
}

function validatePayload(payload) {
  const required = ["name", "contact", "description"];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (!["name", "contact", "description"].every((key) => typeof payload[key] === "string" && payload[key].trim().length > 0)) {
    throw new Error("All fields must be non-empty strings.");
  }
}

module.exports = async function handler(request, response) {
  const { method, query } = request;
  const { id } = query;

  try {
    await connectToDatabase();
  } catch (error) {
    console.error("MongoDB connection error", error);
    response.status(500).json({ error: "Failed to connect to the database." });
    return;
  }

  if (method === "GET") {
    if (Array.isArray(id)) {
      response.status(400).json({ error: "Only one appointment id may be provided." });
      return;
    }

    if (id) {
      if (!Types.ObjectId.isValid(id)) {
        response.status(400).json({ error: "The appointment id is not a valid MongoDB ObjectId." });
        return;
      }

      try {
        const appointment = await Appointment.findById(id).lean();

        if (!appointment) {
          response.status(404).json({ error: "Appointment not found." });
          return;
        }

        response.status(200).json(formatAppointment(appointment));
        return;
      } catch (error) {
        console.error(`Failed to fetch appointment ${id}`, error);
        response.status(500).json({ error: "Failed to fetch appointment." });
        return;
      }
    }

    try {
      const appointments = await Appointment.find().sort({ createdAt: -1 }).lean();
      response.status(200).json(appointments.map(formatAppointment));
      return;
    } catch (error) {
      console.error("Failed to fetch appointments", error);
      response.status(500).json({ error: "Failed to fetch appointments." });
      return;
    }
  }

  if (method === "POST") {
    if (id !== undefined) {
      response.status(400).json({ error: "Appointment id should not be provided when creating an appointment." });
      return;
    }

    let payload = {};

    try {
      payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      validatePayload(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request body.";
      response.status(400).json({ error: message });
      return;
    }

    try {
      const appointment = await Appointment.create({
        name: payload.name.trim(),
        contact: payload.contact.trim(),
        description: payload.description.trim(),
      });

      response.status(201).json(formatAppointment(appointment));
      return;
    } catch (error) {
      console.error("Failed to create appointment", error);
      response.status(500).json({ error: "Failed to create appointment." });
      return;
    }
  }

  if (method === "PUT") {
    if (Array.isArray(id) || !id) {
      response.status(400).json({ error: "A single appointment id is required to update an appointment." });
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ error: "The appointment id is not a valid MongoDB ObjectId." });
      return;
    }

    let payload = {};

    try {
      payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      validatePayload(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request body.";
      response.status(400).json({ error: message });
      return;
    }

    try {
      const updated = await Appointment.findByIdAndUpdate(
        id,
        {
          name: payload.name.trim(),
          contact: payload.contact.trim(),
          description: payload.description.trim(),
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) {
        response.status(404).json({ error: "Appointment not found." });
        return;
      }

      response.status(200).json(formatAppointment(updated));
      return;
    } catch (error) {
      console.error(`Failed to update appointment ${id}`, error);
      response.status(500).json({ error: "Failed to update appointment." });
      return;
    }
  }

  if (method === "DELETE") {
    if (Array.isArray(id) || !id) {
      response.status(400).json({ error: "A single appointment id is required to delete an appointment." });
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ error: "The appointment id is not a valid MongoDB ObjectId." });
      return;
    }

    try {
      const deleted = await Appointment.findByIdAndDelete(id).lean();

      if (!deleted) {
        response.status(404).json({ error: "Appointment not found." });
        return;
      }

      response.status(204).end();
      return;
    } catch (error) {
      console.error(`Failed to delete appointment ${id}`, error);
      response.status(500).json({ error: "Failed to delete appointment." });
      return;
    }
  }

  response.setHeader("Allow", "GET, POST, PUT, DELETE");
  response.status(405).json({ error: `Method ${method} not allowed.` });
};
