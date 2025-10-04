const connectToDatabase = require('./_lib/db-optimized');
const Firm = require('./models/firm');
const Service = require('./models/service');
const Appointment = require('./models/appointment');

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
        
      case 'appointments':
        if (req.method === 'POST') {
          return await handleAppointmentCreate(req, res);
        }
        return await handleAppointmentsList(req, res);
        
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

// Firms list handler
async function handleFirmsList(req, res) {
  const { q, city, page = 1, size = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(size);
  const limit = parseInt(size);
  
  const query = {};
  if (q) query.name = { $regex: q, $options: 'i' };
  if (city) query.city = city;
  
  const [total, firms] = await Promise.all([
    Firm.countDocuments(query),
    Firm.find(query)
      .select('name description address city contact_email contact_phone email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  
  const items = firms.map(firm => ({
    id: firm._id.toString(),
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
}

// Firm detail handler
async function handleFirmDetail(req, res, id) {
  const firm = await Firm.findById(id).lean();
  
  if (!firm) {
    return res.status(404).json({ error: 'Firm not found' });
  }
  
  res.json({
    id: firm._id.toString(),
    name: firm.name,
    description: firm.description,
    address: firm.address,
    city: firm.city,
    contact_email: firm.contact_email || firm.email,
    contact_phone: firm.contact_phone || firm.phone
  });
}

// Services list handler
async function handleServicesList(req, res) {
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
  
  const [total, services] = await Promise.all([
    Service.countDocuments(query),
    Service.find(query)
      .populate('firm_id', 'name address')
      .select('title description category price firm_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  
  const items = services.map(service => ({
    id: service._id.toString(),
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price || null,
    firm_id: service.firm_id?._id?.toString() || service.firm_id,
    firm_name: service.firm_id?.name || null,
    firm_address: service.firm_id?.address || null
  }));
  
  res.json({
    items,
    total,
    page: parseInt(page),
    size: parseInt(size),
    pages: Math.ceil(total / parseInt(size))
  });
}

// Service detail handler
async function handleServiceDetail(req, res, id) {
  const service = await Service.findById(id)
    .populate('firm_id', 'name address')
    .lean();
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  res.json({
    id: service._id.toString(),
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price || null,
    firm_id: service.firm_id?._id?.toString() || service.firm_id,
    firm_name: service.firm_id?.name || null,
    firm_address: service.firm_id?.address || null
  });
}

// Appointments list handler
async function handleAppointmentsList(req, res) {
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
  
  const [total, appointments] = await Promise.all([
    Appointment.countDocuments(query),
    Appointment.find(query)
      .populate('firm_id', 'name')
      .populate('service_id', 'title')
      .sort({ appointment_time: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  
  const items = appointments.map(appointment => ({
    id: `apt-${appointment._id.toString()}`,
    name: appointment.name,
    phone: appointment.phone,
    email: appointment.email,
    firm_id: appointment.firm_id?._id?.toString() || appointment.firm_id,
    firm_name: appointment.firm_id?.name || null,
    service_id: appointment.service_id?._id?.toString() || appointment.service_id,
    service_name: appointment.service_id?.title || null,
    time: new Date(appointment.appointment_time).toISOString(),
    remark: appointment.remark,
    status: appointment.status,
    created_at: new Date(appointment.createdAt).toISOString()
  }));
  
  res.json({
    items,
    total,
    page: parseInt(page),
    size: parseInt(size),
    pages: Math.ceil(total / parseInt(size))
  });
}

// Appointment create handler
async function handleAppointmentCreate(req, res) {
  const { name, phone, email, firm_id, service_id, time, remark } = req.body;
  
  // Validate required fields
  if (!name || !phone || !firm_id || !service_id || !time) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['name', 'phone', 'firm_id', 'service_id', 'time']
    });
  }
  
  // Create appointment
  const appointment = new Appointment({
    name,
    phone,
    email: email || undefined,
    firm_id,
    service_id,
    appointment_time: new Date(time),
    remark: remark || undefined,
    status: 'pending'
  });
  
  const savedAppointment = await appointment.save();
  
  res.status(201).json({
    status: 'ok',
    message: '预约提交成功',
    appointment_id: `apt-${savedAppointment._id.toString()}`
  });
}