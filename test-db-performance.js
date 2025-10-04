require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'test';

console.log('🔍 Testing database connection performance...');
console.log('Database:', MONGODB_DB);
console.log('URI prefix:', MONGODB_URI ? MONGODB_URI.substring(0, 30) + '...' : 'NOT SET');

async function testDatabasePerformance() {
  const startTime = Date.now();
  
  try {
    // Test 1: Connection time
    console.log('\n📊 Test 1: Connection Time');
    const connectStart = Date.now();
    
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    const connectTime = Date.now() - connectStart;
    console.log(`✅ Connected in ${connectTime}ms`);
    
    // Test 2: Simple query time
    console.log('\n📊 Test 2: Simple Query Performance');
    const db = mongoose.connection.db;
    
    // List collections
    const listStart = Date.now();
    const collections = await db.listCollections().toArray();
    console.log(`✅ Listed ${collections.length} collections in ${Date.now() - listStart}ms`);
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    // Test 3: Count documents
    console.log('\n📊 Test 3: Count Documents');
    for (const collection of ['firms', 'services', 'appointments']) {
      if (collections.some(c => c.name === collection)) {
        const countStart = Date.now();
        const count = await db.collection(collection).countDocuments();
        console.log(`✅ ${collection}: ${count} documents (${Date.now() - countStart}ms)`);
      }
    }
    
    // Test 4: Find query
    console.log('\n📊 Test 4: Find Query Performance');
    if (collections.some(c => c.name === 'firms')) {
      const findStart = Date.now();
      const firms = await db.collection('firms').find({}).limit(5).toArray();
      console.log(`✅ Found ${firms.length} firms in ${Date.now() - findStart}ms`);
    }
    
    // Test 5: Complex query with sort
    console.log('\n📊 Test 5: Complex Query with Sort');
    if (collections.some(c => c.name === 'firms')) {
      const complexStart = Date.now();
      const result = await db.collection('firms')
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      console.log(`✅ Complex query returned ${result.length} results in ${Date.now() - complexStart}ms`);
    }
    
    const totalTime = Date.now() - startTime;
    console.log('\n✨ Total test time:', totalTime + 'ms');
    
    // Analysis
    console.log('\n📋 Performance Analysis:');
    if (connectTime > 5000) {
      console.log('❌ Connection is SLOW (>5s) - likely network/firewall issue');
    } else if (connectTime > 2000) {
      console.log('⚠️ Connection is moderate (2-5s) - may cause timeouts under load');
    } else {
      console.log('✅ Connection is fast (<2s)');
    }
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: Check if MongoDB Atlas whitelist includes Vercel IPs');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Solution: Verify MONGODB_URI credentials are correct');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Solution: Network issue - check MongoDB Atlas region and Vercel function region');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Test completed');
  }
}

testDatabasePerformance();