const connectToDatabase = require('../../_lib/db');
const Firm = require('../../models/firm');
const Service = require('../../models/service');

module.exports = async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Firm ID is required' });
  }

  try {
    await connectToDatabase();

    // 查询律所详情
    const firm = await Firm.findById(id)
      .select('name description address city contact_email contact_phone email phone available_times')
      .lean();

    if (!firm) {
      return res.status(404).json({ error: 'Firm not found' });
    }

    // 查询律所的服务
    const services = await Service.find({ firm_id: id })
      .select('title description category price available_times')
      .lean();

    // 格式化响应数据
    const response = {
      id: firm._id.toString(),
      name: firm.name,
      description: firm.description,
      address: firm.address,
      city: firm.city,
      contact_email: firm.contact_email || firm.email,
      contact_phone: firm.contact_phone || firm.phone,
      available_times: (firm.available_times || [])
        .filter(time => new Date(time) > new Date())
        .map(time => new Date(time).toISOString()),
      services: services.map(service => ({
        id: service._id.toString(),
        title: service.title,
        description: service.description,
        category: service.category,
        price: service.price || null,
        available_times: (service.available_times || [])
          .filter(time => new Date(time) > new Date())
          .map(time => new Date(time).toISOString())
      }))
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching firm details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch firm details',
      details: error.message 
    });
  }
};