const { Types } = require("mongoose");
const connectToDatabase = require("../_lib/db");
const Firm = require("../models/firm");
const seedFirms = require("../_data/firms");

function formatFirm(document) {
  const {
    _id,
    name,
    slug,
    city,
    address,
    phone,
    email,
    website,
    description,
    practiceAreas,
    tags,
    lawyers,
  } = document;

  return {
    id: _id.toString(),
    name,
    slug,
    city,
    address,
    phone,
    email,
    website,
    description,
    practiceAreas,
    tags,
    lawyers,
  };
}

function validatePayload(payload) {
  const required = ["name", "slug", "city", "address", "description"];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (!required.every((key) => typeof payload[key] === "string" && payload[key].trim().length > 0)) {
    throw new Error("Core firm fields must be non-empty strings.");
  }

  const arrayFields = ["practiceAreas", "tags"];
  arrayFields.forEach((field) => {
    if (payload[field] !== undefined && !Array.isArray(payload[field])) {
      throw new Error(`${field} must be an array of strings when provided.`);
    }
  });

  if (payload.lawyers !== undefined) {
    if (!Array.isArray(payload.lawyers)) {
      throw new Error("lawyers must be an array when provided.");
    }

    payload.lawyers.forEach((lawyer, index) => {
      if (!lawyer || typeof lawyer !== "object") {
        throw new Error(`lawyers[${index}] must be an object.`);
      }

      if (typeof lawyer.name !== "string" || lawyer.name.trim().length === 0) {
        throw new Error(`lawyers[${index}].name must be a non-empty string.`);
      }
    });
  }
}

function normalisePayload(payload) {
  return {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    city: payload.city.trim(),
    address: payload.address.trim(),
    phone: payload.phone?.trim() ?? "",
    email: payload.email?.trim() ?? "",
    website: payload.website?.trim() ?? "",
    description: payload.description.trim(),
    practiceAreas: Array.isArray(payload.practiceAreas) ? payload.practiceAreas : [],
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    lawyers: Array.isArray(payload.lawyers)
      ? payload.lawyers.map((lawyer) => ({
          name: lawyer.name?.trim() ?? "",
          title: lawyer.title?.trim() ?? "",
          phone: lawyer.phone?.trim() ?? "",
          email: lawyer.email?.trim() ?? "",
          specialties: Array.isArray(lawyer.specialties) ? lawyer.specialties : [],
        }))
      : [],
  };
}

async function ensureSeedData() {
  const count = await Firm.estimatedDocumentCount();

  if (count === 0) {
    try {
      // Populate the firms collection with starter data so the listing has content out of the box.
      await Firm.insertMany(seedFirms, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }
}

function resolveFilter(identifier) {
  if (Types.ObjectId.isValid(identifier)) {
    return { _id: identifier };
  }

  return { slug: identifier };
}

module.exports = async function handler(request, response) {
  const { method, query } = request;
  const { id } = query;

  try {
    await connectToDatabase();
    await ensureSeedData();
  } catch (error) {
    console.error("MongoDB connection error", error);
    response.status(500).json({ error: "Failed to connect to the database." });
    return;
  }

  if (method === "GET") {
    if (Array.isArray(id)) {
      response.status(400).json({ error: "Only one firm id or slug may be provided." });
      return;
    }

    if (id) {
      try {
        const firm = await Firm.findOne(resolveFilter(id)).lean();

        if (!firm) {
          response.status(404).json({ error: "Firm not found." });
          return;
        }

        response.status(200).json(formatFirm(firm));
        return;
      } catch (error) {
        console.error(`Failed to fetch firm ${id}`, error);
        response.status(500).json({ error: "Failed to fetch firm." });
        return;
      }
    }

    try {
      const firms = await Firm.find().sort({ createdAt: -1 }).lean();
      response.status(200).json(firms.map(formatFirm));
      return;
    } catch (error) {
      console.error("Failed to fetch firms", error);
      response.status(500).json({ error: "Failed to fetch firms." });
      return;
    }
  }

  if (method === "POST") {
    if (id !== undefined) {
      response.status(400).json({ error: "Firm id or slug should not be provided when creating a firm." });
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
      const created = await Firm.create(normalisePayload(payload));
      response.status(201).json(formatFirm(created));
      return;
    } catch (error) {
      if (error.code === 11000) {
        response.status(409).json({ error: "Firm slug must be unique." });
        return;
      }

      console.error("Failed to create firm", error);
      response.status(500).json({ error: "Failed to create firm." });
      return;
    }
  }

  if (method === "PUT") {
    if (Array.isArray(id) || !id) {
      response.status(400).json({ error: "A single firm id or slug is required to update a firm." });
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
      const updated = await Firm.findOneAndUpdate(resolveFilter(id), normalisePayload(payload), {
        new: true,
        runValidators: true,
      }).lean();

      if (!updated) {
        response.status(404).json({ error: "Firm not found." });
        return;
      }

      response.status(200).json(formatFirm(updated));
      return;
    } catch (error) {
      if (error.code === 11000) {
        response.status(409).json({ error: "Firm slug must be unique." });
        return;
      }

      console.error(`Failed to update firm ${id}`, error);
      response.status(500).json({ error: "Failed to update firm." });
      return;
    }
  }

  if (method === "DELETE") {
    if (Array.isArray(id) || !id) {
      response.status(400).json({ error: "A single firm id or slug is required to delete a firm." });
      return;
    }

    try {
      const deleted = await Firm.findOneAndDelete(resolveFilter(id)).lean();

      if (!deleted) {
        response.status(404).json({ error: "Firm not found." });
        return;
      }

      response.status(204).end();
      return;
    } catch (error) {
      console.error(`Failed to delete firm ${id}`, error);
      response.status(500).json({ error: "Failed to delete firm." });
      return;
    }
  }

  response.setHeader("Allow", "GET, POST, PUT, DELETE");
  response.status(405).json({ error: `Method ${method} not allowed.` });
};
