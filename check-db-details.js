require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'test';

console.log('🔍 Checking database details...');
console.log('Database name from env:', MONGODB_DB);
console.log('MongoDB URI:', MONGODB_URI ? MONGODB_URI.substring(0, 50) + '...' : 'NOT SET');

async function checkDatabaseDetails() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('\n✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    console.log('Actual database name:', db.databaseName);
    
    // List all collections
    console.log('\n📦 Collections in database:');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
      
      // Show sample document for firms collection
      if (collection.name === 'firms') {
        console.log('\n📄 Sample firm document:');
        const sample = await db.collection('firms').findOne();
        console.log(JSON.stringify(sample, null, 2));
      }
    }
    
    // Check the Firm model
    console.log('\n🔍 Checking Mongoose Firm model...');
    const Firm = require('./api/models/firm');
    
    // Get model collection name
    console.log('Model collection name:', Firm.collection.collectionName);
    
    // Try to query using the model
    const firmCount = await Firm.countDocuments();
    console.log('Firms count via model:', firmCount);
    
    // Try to find firms
    const firms = await Firm.find().limit(2).lean();
    console.log('\n📋 Firms via Mongoose model:');
    console.log(JSON.stringify(firms, null, 2));
    
    // Check if there's a database name mismatch
    console.log('\n🔍 Connection details:');
    console.log('Connection database:', mongoose.connection.db.databaseName);
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('Connection host:', mongoose.connection.host);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Disconnected');
  }
}

checkDatabaseDetails();