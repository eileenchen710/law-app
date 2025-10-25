const connectToDatabase = require('../../_lib/db-optimized');
const Firm = require('../../models/firm');

module.exports = async function handler(req, res) {
  console.log('Firms list API called:', { method: req.method, query: req.query });
  
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `W/"${Date.now()}-${Math.random().toString(36).slice(2)}"`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Connecting to database...');
    const dbStartTime = Date.now();
    await connectToDatabase();
    console.log(`Database connected in ${Date.now() - dbStartTime}ms`);
    
    const { q, city, page = 1, size = 10 } = req.query;
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    // 构建查询条件
    const query = {};
    
    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }
    
    if (city) {
      query.city = city;
    }

    // 并行执行计数和查询
    console.log('Executing parallel queries with:', query);
    const queryStartTime = Date.now();
    
    const [total, firms] = await Promise.all([
      Firm.countDocuments(query),
      Firm.find(query)
        .select('name slug description address city contact_email contact_phone email phone website services practice_areas tags lawyers price rating cases recommended available_times')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(5000) // 添加5秒超时
    ]);
    
    console.log(`Queries completed in ${Date.now() - queryStartTime}ms, found ${total} total, fetched ${firms.length} firms`);

    // 格式化响应数据
    const now = new Date();
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
        .filter(time => new Date(time) > now)
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
    console.error('Error fetching firms:', error);
    res.status(500).json({ 
      error: 'Failed to fetch firms',
      details: error.message 
    });
  }
};