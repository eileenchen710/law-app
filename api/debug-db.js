const mongoose = require('mongoose');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const info = {
    env: {
      MONGODB_URI: process.env.MONGODB_URI ? '***SET***' : 'NOT SET',
      MONGODB_DB: process.env.MONGODB_DB || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL
    },
    connection: null,
    collections: [],
    firmCount: null,
    error: null
  };
  
  try {
    // Get connection info without actually connecting
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB = process.env.MONGODB_DB;
    
    if (!MONGODB_URI) {
      info.error = 'MONGODB_URI not set';
      return res.status(500).json(info);
    }
    
    // Connect to database
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 1
    });
    
    const db = mongoose.connection.db;
    
    info.connection = {
      database: db.databaseName,
      state: mongoose.connection.readyState,
      host: mongoose.connection.host
    };
    
    // Get collections
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      info.collections.push({
        name: col.name,
        count: count
      });
    }
    
    // Try to query firms directly
    const firmsColl = db.collection('firms');
    info.firmCount = await firmsColl.countDocuments();
    
    // Get one firm as sample
    const sampleFirm = await firmsColl.findOne();
    if (sampleFirm) {
      info.sampleFirm = {
        id: sampleFirm._id,
        name: sampleFirm.name,
        city: sampleFirm.city
      };
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    info.error = {
      message: error.message,
      code: error.code
    };
  }
  
  res.status(200).json(info);
};