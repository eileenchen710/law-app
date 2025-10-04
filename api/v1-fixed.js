const connectToDatabase = require('./_lib/db-optimized');

// Single entry point for all v1 API routes to reduce cold starts
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    
    // Get database directly
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Parse the URL path
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const resource = urlParts[2]; // After /api/v1/
    const id = urlParts[3];
    
    // Route to appropriate handler
    switch (resource) {
      case 'firms':
        if (id) {
          return await handleFirmDetail(req, res, id, db);
        }
        return await handleFirmsList(req, res, db);
        
      case 'services':
        if (id) {
          return await handleServiceDetail(req, res, id, db);
        }
        return await handleServicesList(req, res, db);
        
      case 'appointments':
        if (req.method === 'POST') {
          return await handleAppointmentCreate(req, res, db);
        }
        return await handleAppointmentsList(req, res, db);
        
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

// Firms list handler - using direct collection access
async function handleFirmsList(req, res, db) {
  try {
    const { q, city, page = 1, size = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);
    
    const query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (city) query.city = city;
    
    console.log('Querying firms with:', query, 'skip:', skip, 'limit:', limit);
    
    // Use direct collection access
    const firmsCollection = db.collection('firms');
    
    const [total, firms] = await Promise.all([
      firmsCollection.countDocuments(query),
      firmsCollection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);
    
    console.log(`Found ${total} total firms, returning ${firms.length}`);
    
    const items = firms.map(firm => ({
      id: firm._id ? firm._id.toString() : firm.id,
      name: firm.name,
      description: firm.description,
      address: firm.address,
      city: firm.city,
      contact_email: firm.contact_email || firm.email,
      contact_phone: firm.contact_phone || firm.phone
    }));
    
    res.json({
      items,
      total,
      page: parseInt(page),
      size: parseInt(size),
      pages: Math.ceil(total / parseInt(size))
    });
  } catch (error) {
    console.error('Error in handleFirmsList:', error);
    throw error;
  }
}

// Firm detail handler
async function handleFirmDetail(req, res, id, db) {
  const firmsCollection = db.collection('firms');
  
  // Try to find by _id (could be string or ObjectId)
  let firm = await firmsCollection.findOne({ _id: id });
  
  if (!firm) {
    // Try with ObjectId if the id looks like one
    const { ObjectId } = require('mongodb');
    if (ObjectId.isValid(id)) {
      firm = await firmsCollection.findOne({ _id: new ObjectId(id) });
    }
  }
  
  if (!firm) {
    return res.status(404).json({ error: 'Firm not found' });
  }
  
  res.json({
    id: firm._id ? firm._id.toString() : firm.id,
    name: firm.name,
    description: firm.description,
    address: firm.address,
    city: firm.city,
    contact_email: firm.contact_email || firm.email,
    contact_phone: firm.contact_phone || firm.phone
  });
}

// Services list handler
async function handleServicesList(req, res, db) {
  try {
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
    
    const servicesCollection = db.collection('services');
    const firmsCollection = db.collection('firms');
    
    const [total, services] = await Promise.all([
      servicesCollection.countDocuments(query),
      servicesCollection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);
    
    // Manually populate firm info
    for (const service of services) {
      if (service.firm_id) {
        const firm = await firmsCollection.findOne({ _id: service.firm_id });
        service.firm = firm;
      }
    }
    
    const items = services.map(service => ({
      id: service._id ? service._id.toString() : service.id,
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price || null,
      firm_id: service.firm_id,
      firm_name: service.firm?.name || null,
      firm_address: service.firm?.address || null
    }));
    
    res.json({
      items,
      total,
      page: parseInt(page),
      size: parseInt(size),
      pages: Math.ceil(total / parseInt(size))
    });
  } catch (error) {
    console.error('Error in handleServicesList:', error);
    throw error;
  }
}

// Service detail handler
async function handleServiceDetail(req, res, id, db) {
  const servicesCollection = db.collection('services');
  const firmsCollection = db.collection('firms');
  
  let service = await servicesCollection.findOne({ _id: id });
  
  if (!service) {
    const { ObjectId } = require('mongodb');
    if (ObjectId.isValid(id)) {
      service = await servicesCollection.findOne({ _id: new ObjectId(id) });
    }
  }
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  // Get firm info
  let firm = null;
  if (service.firm_id) {
    firm = await firmsCollection.findOne({ _id: service.firm_id });
  }
  
  res.json({
    id: service._id ? service._id.toString() : service.id,
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price || null,
    firm_id: service.firm_id,
    firm_name: firm?.name || null,
    firm_address: firm?.address || null
  });
}

// Appointments list handler
async function handleAppointmentsList(req, res, db) {
  try {
    const { firm_id, date, page = 1, size = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);
    
    const query = {};
    if (firm_id) query.firm_id = firm_id;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointment_time = { $gte: startDate, $lte: endDate };
    }
    
    const appointmentsCollection = db.collection('appointments');
    const firmsCollection = db.collection('firms');
    const servicesCollection = db.collection('services');
    
    const [total, appointments] = await Promise.all([
      appointmentsCollection.countDocuments(query),
      appointmentsCollection.find(query)
        .sort({ appointment_time: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);
    
    // Manually populate firm and service info
    for (const apt of appointments) {
      if (apt.firm_id) {
        apt.firm = await firmsCollection.findOne({ _id: apt.firm_id });
      }
      if (apt.service_id) {
        apt.service = await servicesCollection.findOne({ _id: apt.service_id });
      }
    }
    
    const items = appointments.map(appointment => ({
      id: `apt-${appointment._id ? appointment._id.toString() : appointment.id}`,
      name: appointment.name,
      phone: appointment.phone,
      email: appointment.email,
      firm_id: appointment.firm_id,
      firm_name: appointment.firm?.name || null,
      service_id: appointment.service_id,
      service_name: appointment.service?.title || null,
      time: appointment.appointment_time ? new Date(appointment.appointment_time).toISOString() : null,
      remark: appointment.remark,
      status: appointment.status,
      created_at: appointment.createdAt ? new Date(appointment.createdAt).toISOString() : null
    }));
    
    res.json({
      items,
      total,
      page: parseInt(page),
      size: parseInt(size),
      pages: Math.ceil(total / parseInt(size))
    });
  } catch (error) {
    console.error('Error in handleAppointmentsList:', error);
    throw error;
  }
}

// Appointment create handler
async function handleAppointmentCreate(req, res, db) {
  const { name, phone, email, firm_id, service_id, time, remark } = req.body;
  
  // Validate required fields
  if (!name || !phone || !firm_id || !service_id || !time) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['name', 'phone', 'firm_id', 'service_id', 'time']
    });
  }
  
  const appointmentsCollection = db.collection('appointments');
  
  // Create appointment document
  const appointment = {
    name,
    phone,
    email: email || undefined,
    firm_id,
    service_id,
    appointment_time: new Date(time),
    remark: remark || undefined,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await appointmentsCollection.insertOne(appointment);
  
  res.status(201).json({
    status: 'ok',
    message: '预约提交成功',
    appointment_id: `apt-${result.insertedId.toString()}`
  });
}