const connectToDatabase = require("./db");
const Appointment = require("./models/appointment");

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
  const { method } = request;

  try {
    await connectToDatabase();
  } catch (error) {
    console.error("MongoDB connection error", error);
    response.status(500).json({ error: "Failed to connect to the database." });
    return;
  }

  if (method === "GET") {
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

  response.setHeader("Allow", "GET, POST");
  response.status(405).json({ error: `Method ${method} not allowed.` });
};
