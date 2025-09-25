const connectToDatabase = require("./db");
const Firm = require("./models/firm");
const seedFirms = require("./_data/firms");

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
      // Populate the firms collection with starter data so the listing has content out of the box.
      await Firm.insertMany(seedFirms, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
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
      await ensureSeedData();
      const firms = await Firm.find().sort({ createdAt: -1 }).lean();
      response.status(200).json(firms.map(formatFirm));
      return;
    } catch (error) {
      console.error("Failed to fetch firms", error);
      response.status(500).json({ error: "Failed to fetch firms." });
      return;
    }
  }

  response.setHeader("Allow", "GET");
  response.status(405).json({ error: `Method ${method} not allowed.` });
};
