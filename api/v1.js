const connectToDatabase = require('./_lib/db-optimized');
const mongoose = require('mongoose');
const consultationsHandler = require('./_handlers/v1/consultations');
const authHandler = require('./_handlers/v1/auth');
const usersMeHandler = require('./_handlers/v1/users-me');
const { authenticateRequest } = require('./_lib/auth');

// Helper function to find document by ID (supports both string and ObjectId)
async function findById(collection, id) {
  const { ObjectId } = require('mongodb');

  // Try with original id first
  let doc = await collection.findOne({ _id: id });

  // If not found and id is a valid ObjectId string, try with ObjectId
  if (!doc && ObjectId.isValid(id)) {
    doc = await collection.findOne({ _id: new ObjectId(id) });
  }

  return doc;
}

// Single entry point for all v1 API routes to reduce cold starts
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  try {
    // Connect to database
    await connectToDatabase();
    console.log(`DB connected in ${Date.now() - startTime}ms`);
    
    // Parse the URL path
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const resource = urlParts[2]; // After /api/v1/
    const id = urlParts[3];
    
    // Route to appropriate handler
    switch (resource) {
      case 'firms':
        if (id) {
          return await handleFirmDetail(req, res, id);
        }
        return await handleFirmsList(req, res);
        
      case 'services':
        if (id) {
          return await handleServiceDetail(req, res, id);
        }
        return await handleServicesList(req, res);

      case 'consultations':
        // Support both /consultations and /consultations/:id
        return await consultationsHandler(req, res);
      case 'auth':
        req.params = req.params || {};
        req.params.action = id;
        return await authHandler(req, res);
      case 'users':
        if (id === 'me') {
          return await usersMeHandler(req, res);
        }
        return res.status(404).json({ error: 'Route not found' });
        
      default:
        return res.status(404).json({ error: 'Route not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      time: Date.now() - startTime
    });
  }
};

// Firms list handler - using direct MongoDB access
async function handleFirmsList(req, res) {
  const startTime = Date.now();
  const { q, city, page = 1, size = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(size);
  const limit = parseInt(size);

  const query = {};
  if (q) query.name = { $regex: q, $options: 'i' };
  if (city) query.city = city;

  const db = mongoose.connection.db;
  const firmsCollection = db.collection('firms');

  const [total, firms] = await Promise.all([
    firmsCollection.countDocuments(query),
    firmsCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
  ]);

  console.log(`[Performance] Firms list query completed in ${Date.now() - startTime}ms (${firms.length} items)`);
  
  const items = firms.map(firm => ({
    id: firm._id.toString(),
    name: firm.name,
    slug: firm.slug,
    description: firm.description,
    address: firm.address,
    city: firm.city,
    phone: firm.phone,
    email: firm.email,
    website: firm.website,
    contact_email: firm.contact_email || firm.email,
    contact_phone: firm.contact_phone || firm.phone,
    services: firm.services || [],
    practice_areas: firm.practice_areas || firm.practiceAreas || [],
    tags: firm.tags || [],
    lawyers: firm.lawyers || [],
    price: firm.price,
    rating: firm.rating,
    cases: firm.cases,
    recommended: firm.recommended || false,
    available_times: (firm.available_times || [])
      .filter(time => new Date(time) > new Date())
      .map(time => new Date(time).toISOString())
  }));
  
  res.json({
    items,
    total,
    page: parseInt(page),
    size: parseInt(size),
    pages: Math.ceil(total / parseInt(size))
  });
}

// Firm detail handler - using direct MongoDB access
async function handleFirmDetail(req, res, id) {
  const db = mongoose.connection.db;
  const firmsCollection = db.collection('firms');

  const firm = await findById(firmsCollection, id);

  if (!firm) {
    return res.status(404).json({ error: 'Firm not found' });
  }
  
  res.json({
    id: firm._id.toString(),
    name: firm.name,
    slug: firm.slug,
    description: firm.description,
    address: firm.address,
    city: firm.city,
    phone: firm.phone,
    email: firm.email,
    website: firm.website,
    contact_email: firm.contact_email || firm.email,
    contact_phone: firm.contact_phone || firm.phone,
    services: firm.services || [],
    practice_areas: firm.practice_areas || firm.practiceAreas || [],
    tags: firm.tags || [],
    lawyers: firm.lawyers || [],
    price: firm.price,
    rating: firm.rating,
    cases: firm.cases,
    recommended: firm.recommended || false,
    available_times: (firm.available_times || [])
      .filter(time => new Date(time) > new Date())
      .map(time => new Date(time).toISOString())
  });
}

// Services list handler
async function handleServicesList(req, res) {
  const startTime = Date.now();
  const { q, firm_id, category, page = 1, size = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(size);
  const limit = parseInt(size);

  const query = {};
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }
  if (firm_id) query.firm_id = firm_id;
  if (category) query.category = category;

  const db = mongoose.connection.db;
  const servicesCollection = db.collection('services');
  const firmsCollection = db.collection('firms');

  const queryStartTime = Date.now();
  const [total, services] = await Promise.all([
    servicesCollection.countDocuments(query),
    servicesCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
  ]);
  console.log(`[Performance] Services query completed in ${Date.now() - queryStartTime}ms (${services.length} items)`);

  // Batch populate firm info to avoid N+1 queries
  const firmIds = services
    .map(service => service.law_firm_id || service.firm_id)
    .filter(Boolean);

  let firmsMap = {};
  if (firmIds.length > 0) {
    const firmQueryStartTime = Date.now();
    const firms = await firmsCollection.find({ _id: { $in: firmIds } }).toArray();
    console.log(`[Performance] Batch firm lookup completed in ${Date.now() - firmQueryStartTime}ms (${firms.length} firms)`);
    firmsMap = firms.reduce((acc, firm) => {
      acc[firm._id.toString()] = firm;
      return acc;
    }, {});
  }

  // Attach firm info to services
  for (const service of services) {
    const firmId = service.law_firm_id || service.firm_id;
    if (firmId) {
      const firmIdStr = firmId.toString();
      service.firm = firmsMap[firmIdStr] || null;
    }
  }

  console.log(`[Performance] Total services list handler time: ${Date.now() - startTime}ms`);
  
  const items = services.map(service => ({
    id: service._id ? service._id.toString() : service.id,
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price || null,
    duration: service.duration || '1-2小时',
    lawyer_name: service.lawyer_name || '专业律师',
    lawyer_title: service.lawyer_title || '资深律师',
    firm_id: service.firm_id,
    law_firm_id: service.law_firm_id,
    firm_name: service.firm?.name || null,
    firm_address: service.firm?.address || null,
    status: service.status || 'active'
  }));
  
  res.json({
    items,
    total,
    page: parseInt(page),
    size: parseInt(size),
    pages: Math.ceil(total / parseInt(size))
  });
}

// Service detail handler - using direct MongoDB access
async function handleServiceDetail(req, res, id) {
  const db = mongoose.connection.db;
  const servicesCollection = db.collection('services');
  const firmsCollection = db.collection('firms');

  const service = await findById(servicesCollection, id);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  // Get firm info if available
  let firm = null;
  const firmId = service.law_firm_id || service.firm_id;
  if (firmId) {
    firm = await findById(firmsCollection, firmId);
  }
  
  res.json({
    id: service._id ? service._id.toString() : service.id,
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price || null,
    duration: service.duration || '1-2小时',
    lawyer_name: service.lawyer_name || '专业律师',
    lawyer_title: service.lawyer_title || '资深律师',
    firm_id: service.firm_id,
    law_firm_id: service.law_firm_id,
    firm_name: firm?.name || null,
    firm_address: firm?.address || null,
    status: service.status || 'active'
  });
}