const connectToDatabase = require('../../_lib/db');
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
    return res.status(400).json({ error: 'Service ID is required' });
  }

  try {
    await connectToDatabase();

    // 查询服务详情并关联律所信息
    const service = await Service.findById(id)
      .populate('firm_id', 'name address city contact_email contact_phone email phone')
      .select('title description category price firm_id available_times')
      .lean();

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // 格式化响应数据
    const response = {
      id: service._id.toString(),
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price || null,
      firm_id: service.firm_id?._id?.toString() || service.firm_id,
      available_times: (service.available_times || [])
        .filter(time => new Date(time) > new Date())
        .map(time => new Date(time).toISOString()),
      firm: service.firm_id ? {
        id: service.firm_id._id.toString(),
        name: service.firm_id.name,
        address: service.firm_id.address,
        city: service.firm_id.city,
        contact_email: service.firm_id.contact_email || service.firm_id.email,
        contact_phone: service.firm_id.contact_phone || service.firm_id.phone
      } : null
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch service details',
      details: error.message 
    });
  }
};