const connectToDatabase = require("../db");
const Service = require("../models/service");

function formatService(document) {
  const { _id, title, description, category, lawyerInfo, status } = document;
  return {
    id: _id.toString(),
    title,
    description,
    category,
    lawyerInfo,
    status,
  };
}

function validatePayload(payload) {
  const required = ["title", "description", "category", "lawyerInfo", "status"];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (!["title", "description", "category", "status"].every((key) => typeof payload[key] === "string" && payload[key].trim().length > 0)) {
    throw new Error("Text fields must be non-empty strings.");
  }

  if (typeof payload.lawyerInfo !== "object" || payload.lawyerInfo === null) {
    throw new Error("The lawyerInfo field must be an object.");
  }
}

module.exports = async function handler(request, response) {
  const { method, query } = request;
  const { id } = query;

  if (!id || Array.isArray(id)) {
    response.status(400).json({ error: "A single service id is required." });
    return;
  }

  try {
    await connectToDatabase();
  } catch (error) {
    console.error("MongoDB connection error", error);
    response.status(500).json({ error: "Failed to connect to the database." });
    return;
  }

  if (method === "PUT") {
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
      const updated = await Service.findByIdAndUpdate(
        id,
        {
          title: payload.title.trim(),
          description: payload.description.trim(),
          category: payload.category.trim(),
          lawyerInfo: payload.lawyerInfo,
          status: payload.status.trim(),
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) {
        response.status(404).json({ error: "Service not found." });
        return;
      }

      response.status(200).json(formatService(updated));
      return;
    } catch (error) {
      console.error(`Failed to update service ${id}`, error);
      response.status(500).json({ error: "Failed to update service." });
      return;
    }
  }

  if (method === "DELETE") {
    try {
      const deleted = await Service.findByIdAndDelete(id).lean();

      if (!deleted) {
        response.status(404).json({ error: "Service not found." });
        return;
      }

      response.status(204).end();
      return;
    } catch (error) {
      console.error(`Failed to delete service ${id}`, error);
      response.status(500).json({ error: "Failed to delete service." });
      return;
    }
  }

  response.setHeader("Allow", "PUT, DELETE");
  response.status(405).json({ error: `Method ${method} not allowed.` });
};
