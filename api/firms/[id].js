const { Types } = require("mongoose");
const connectToDatabase = require("../db");
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

async function ensureSeedData() {
  const count = await Firm.estimatedDocumentCount();

  if (count === 0) {
    try {
      await Firm.insertMany(seedFirms, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }
}

module.exports = async function handler(request, response) {
  const { method, query } = request;
  const { id } = query;

  if (!id || Array.isArray(id)) {
    response.status(400).json({ error: "A single firm id or slug is required." });
    return;
  }

  if (method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: `Method ${method} not allowed.` });
    return;
  }

  try {
    await connectToDatabase();
  } catch (error) {
    console.error("MongoDB connection error", error);
    response.status(500).json({ error: "Failed to connect to the database." });
    return;
  }

  try {
    await ensureSeedData();

    let firm = null;

    if (Types.ObjectId.isValid(id)) {
      firm = await Firm.findById(id).lean();
    }

    if (!firm) {
      firm = await Firm.findOne({ slug: id }).lean();
    }

    if (!firm) {
      response.status(404).json({ error: "Firm not found." });
      return;
    }

    response.status(200).json(formatFirm(firm));
  } catch (error) {
    console.error(`Failed to fetch firm ${id}`, error);
    response.status(500).json({ error: "Failed to fetch firm." });
  }
};
