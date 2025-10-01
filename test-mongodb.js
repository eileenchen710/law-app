require('dotenv').config({ path: '.env.local' });
const connectToDatabase = require('./api/_lib/db');
const Firm = require('./api/models/firm');

async function testMongoConnection() {
  console.log('🔍 测试 MongoDB 连接...');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ 已设置' : '❌ 未设置');
  console.log('MONGODB_DB:', process.env.MONGODB_DB || '❌ 未设置');
  
  try {
    // 测试数据库连接
    console.log('\n📡 正在连接数据库...');
    const connection = await connectToDatabase();
    console.log('✅ 数据库连接成功!');
    
    // 测试数据库操作
    console.log('\n📊 测试数据库操作...');
    
    // 检查集合是否存在
    const collections = await connection.connection.db.listCollections().toArray();
    console.log('📋 现有集合:', collections.map(c => c.name));
    
    // 测试 Firm 模型
    console.log('\n🏢 测试 Firm 模型...');
    const firmCount = await Firm.estimatedDocumentCount();
    console.log(`📈 Firm 集合中有 ${firmCount} 个文档`);
    
    if (firmCount > 0) {
      const sampleFirm = await Firm.findOne();
      console.log('📄 示例律所数据:', {
        id: sampleFirm._id,
        name: sampleFirm.name,
        city: sampleFirm.city
      });
    }
    
    console.log('\n✅ MongoDB 测试完成!');
    
  } catch (error) {
    console.error('❌ MongoDB 测试失败:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
  } finally {
    process.exit(0);
  }
}

testMongoConnection();