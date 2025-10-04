const connectToDatabase = require('./_lib/db');

module.exports = async function handler(req, res) {
  console.log('Test API called at:', new Date().toISOString());
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const steps = [];
  const startTime = Date.now();
  
  try {
    // Step 1: Basic response
    steps.push({ 
      step: 'start', 
      time: 0,
      memory: process.memoryUsage().heapUsed / 1024 / 1024 
    });
    
    // Step 2: Connect to database
    const dbStart = Date.now();
    await connectToDatabase();
    steps.push({ 
      step: 'db_connected', 
      time: Date.now() - startTime,
      memory: process.memoryUsage().heapUsed / 1024 / 1024 
    });
    
    // Step 3: Simple query
    const queryStart = Date.now();
    const mongoose = require('mongoose');
    const count = await mongoose.connection.db.collection('firms').countDocuments();
    steps.push({ 
      step: 'query_done', 
      time: Date.now() - startTime,
      count,
      memory: process.memoryUsage().heapUsed / 1024 / 1024 
    });
    
    res.status(200).json({
      success: true,
      totalTime: Date.now() - startTime,
      steps,
      environment: {
        node: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      error: error.message,
      time: Date.now() - startTime,
      steps,
      stack: error.stack
    });
  }
};