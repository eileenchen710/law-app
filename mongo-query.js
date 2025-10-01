require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function runQuery() {
  try {
    const { MONGODB_URI, MONGODB_DB } = process.env;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI 环境变量未设置');
      return;
    }

    const options = {
      bufferCommands: false,
      dbName: MONGODB_DB,
    };

    await mongoose.connect(MONGODB_URI, options);
    const db = mongoose.connection.db;
    
    console.log('✅ 连接成功!');
    console.log(`🗃️  当前数据库: ${db.databaseName}\n`);

    // 获取命令行参数
    const args = process.argv.slice(2);
    const command = args.join(' ');
    
    if (!command) {
      console.log('📋 可用的查询命令:');
      console.log('  node mongo-query.js collections                    # 显示所有集合');
      console.log('  node mongo-query.js count firms                    # 统计律所数量');
      console.log('  node mongo-query.js find firms                     # 查看所有律所');
      console.log('  node mongo-query.js findone firms                  # 查看一个律所');
      console.log('  node mongo-query.js find firms "{name: /华夏/}"     # 按条件查询');
      console.log('  node mongo-query.js count appointments             # 统计预约数量');
      console.log('  node mongo-query.js count services                 # 统计服务数量');
      return;
    }
    
    const [action, collection, query] = args;
    
    switch (action) {
      case 'collections':
        const collections = await db.listCollections().toArray();
        console.log('📋 集合列表:');
        collections.forEach(col => console.log(`  - ${col.name}`));
        break;
        
      case 'count':
        if (!collection) {
          console.log('❌ 请指定集合名称');
          break;
        }
        const count = query ? 
          await db.collection(collection).countDocuments(eval(`(${query})`)) :
          await db.collection(collection).countDocuments();
        console.log(`📊 ${collection} 集合文档数量: ${count}`);
        break;
        
      case 'find':
        if (!collection) {
          console.log('❌ 请指定集合名称');
          break;
        }
        const findResult = query ? 
          await db.collection(collection).find(eval(`(${query})`)).toArray() :
          await db.collection(collection).find().toArray();
        console.log(`📄 查询结果 (${findResult.length} 条记录):`);
        findResult.forEach((doc, index) => {
          console.log(`${index + 1}. ${JSON.stringify(doc, null, 2)}`);
        });
        break;
        
      case 'findone':
        if (!collection) {
          console.log('❌ 请指定集合名称');
          break;
        }
        const findOneResult = query ? 
          await db.collection(collection).findOne(eval(`(${query})`)) :
          await db.collection(collection).findOne();
        console.log('📄 查询结果:');
        console.log(JSON.stringify(findOneResult, null, 2));
        break;
        
      default:
        console.log('❌ 不支持的操作:', action);
        console.log('支持的操作: collections, count, find, findone');
    }
    
  } catch (error) {
    console.error('❌ 执行查询时出错:', error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

runQuery();