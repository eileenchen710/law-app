const connectToDatabase = require("./db");
const Service = require("./models/service");

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
      const services = await Service.find().sort({ createdAt: -1 }).lean();
      response.status(200).json(services.map(formatService));
      return;
    } catch (error) {
      console.error("Failed to fetch services", error);
      response.status(500).json({ error: "Failed to fetch services." });
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
      const service = await Service.create({
        title: payload.title.trim(),
        description: payload.description.trim(),
        category: payload.category.trim(),
        lawyerInfo: payload.lawyerInfo,
        status: payload.status.trim(),
      });

      response.status(201).json(formatService(service));
      return;
    } catch (error) {
      console.error("Failed to create service", error);
      response.status(500).json({ error: "Failed to create service." });
      return;
    }
  }

  response.setHeader("Allow", "GET, POST");
  response.status(405).json({ error: `Method ${method} not allowed.` });
};
