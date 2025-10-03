const connectToDatabase = require('./_lib/db');

module.exports = async function handler(req, res) {
  console.log('Health check API called');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  
  try {
    // 尝试连接数据库，设置超时
    const dbPromise = connectToDatabase();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );
    
    await Promise.race([dbPromise, timeoutPromise]);
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({ 
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    const responseTime = Date.now() - startTime;
    
    res.status(503).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
};