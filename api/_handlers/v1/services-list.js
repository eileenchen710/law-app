const connectToDatabase = require('../../_lib/db');
const Service = require('../../models/service');
const Firm = require('../../models/firm');

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

  try {
    console.log('Services API: Connecting to database...');
    const dbStartTime = Date.now();
    await connectToDatabase();
    console.log(`Services API: Database connected in ${Date.now() - dbStartTime}ms`);
    
    const { q, firm_id, category, page = 1, size = 10 } = req.query;
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    // 构建查询条件
    const query = {};
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (firm_id) {
      query.firm_id = firm_id;
    }
    
    if (category) {
      query.category = category;
    }

    // 并行执行计数和查询
    console.log('Services API: Executing parallel queries');
    const queryStartTime = Date.now();
    
    const [total, services] = await Promise.all([
      Service.countDocuments(query),
      Service.find(query)
        .populate('firm_id', 'name address')
        .select('title description category price firm_id available_times')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(5000)
    ]);
    
    console.log(`Services API: Queries completed in ${Date.now() - queryStartTime}ms`);

    // 格式化响应数据
    const items = services.map(service => ({
      id: service._id.toString(),
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price || null,
      firm_id: service.firm_id?._id?.toString() || service.firm_id,
      firm_name: service.firm_id?.name || null,
      firm_address: service.firm_id?.address || null,
      available_times: (service.available_times || [])
        .filter(time => new Date(time) > new Date())
        .map(time => new Date(time).toISOString())
    }));

    res.status(200).json({
      items,
      total,
      page: parseInt(page),
      size: parseInt(size),
      pages: Math.ceil(total / parseInt(size))
    });

  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services',
      details: error.message 
    });
  }
};