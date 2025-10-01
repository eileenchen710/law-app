require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function inspectDatabase() {
  try {
    const { MONGODB_URI, MONGODB_DB } = process.env;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI 环境变量未设置');
      return;
    }

    console.log('🔍 正在检查 MongoDB 数据库...\n');
    
    const options = {
      bufferCommands: false,
      dbName: MONGODB_DB,
    };

    await mongoose.connect(MONGODB_URI, options);
    const db = mongoose.connection.db;
    
    console.log('✅ 连接成功!');
    console.log(`🗃️  当前数据库: ${db.databaseName}\n`);
    
    // 获取所有集合
    const collections = await db.listCollections().toArray();
    console.log('📋 数据库集合:');
    
    if (collections.length === 0) {
      console.log('  (没有找到集合)');
    } else {
      for (const collectionInfo of collections) {
        const collection = db.collection(collectionInfo.name);
        const count = await collection.countDocuments();
        
        console.log(`  📁 ${collectionInfo.name} (${count} 个文档)`);
        
        if (count > 0) {
          // 显示一个示例文档
          const sample = await collection.findOne();
          console.log(`     💼 示例数据:`, JSON.stringify(sample, null, 6));
        }
        console.log();
      }
    }
    
    // 如果有特定的集合，显示更多详细信息
    const firmCollection = db.collection('firms');
    const appointmentCollection = db.collection('appointments');
    const serviceCollection = db.collection('services');
    
    console.log('🏢 律所数据详情:');
    const firmCount = await firmCollection.countDocuments();
    if (firmCount > 0) {
      const firms = await firmCollection.find().limit(3).toArray();
      firms.forEach((firm, index) => {
        console.log(`  ${index + 1}. ${firm.name} - ${firm.city}`);
        console.log(`     📧 ${firm.email} | 📞 ${firm.phone}`);
        console.log(`     🏷️  专业领域: ${firm.practiceAreas?.join(', ') || '无'}`);
      });
    } else {
      console.log('  (暂无律所数据)');
    }
    
    console.log('\n📅 预约数据详情:');
    const appointmentCount = await appointmentCollection.countDocuments();
    if (appointmentCount > 0) {
      const appointments = await appointmentCollection.find().limit(3).toArray();
      appointments.forEach((appointment, index) => {
        console.log(`  ${index + 1}. ${appointment.name} - ${appointment.contact}`);
        console.log(`     📝 ${appointment.description}`);
      });
    } else {
      console.log('  (暂无预约数据)');
    }
    
    console.log('\n⚖️ 服务数据详情:');
    const serviceCount = await serviceCollection.countDocuments();
    if (serviceCount > 0) {
      const services = await serviceCollection.find().limit(3).toArray();
      services.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.title} - ${service.category}`);
        console.log(`     📝 ${service.description}`);
        console.log(`     👨‍⚖️ 律师: ${service.lawyerInfo?.name || '未指定'}`);
      });
    } else {
      console.log('  (暂无服务数据)');
    }
    
  } catch (error) {
    console.error('❌ 检查数据库时出错:', error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

inspectDatabase();