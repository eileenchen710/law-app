/**
 * 服务绑定脚本 - 将现有服务绑定到律所，并更新律所的 services 字段
 *
 * 功能：
 * 1. 查看现有的服务和律所数据
 * 2. 更新服务的 law_firm_id 字段
 * 3. 更新律所的 services 数组
 *
 * 运行方式:
 * node scripts/bind-services-to-firms.js
 */

const { MongoClient, ObjectId } = require('mongodb');

// 从环境变量获取 MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/law-app';

// 律所 ID 映射
const FIRM_IDS = {
  huaxia: '68dd0de11f8a0e63c6dc1080',    // 华夏律师事务所
  hisea: '68dd0de11f8a0e63c6dc1081',     // 瀚海律师事务所
  mingde: '68dd0de11f8a0e63c6dc1082'     // 明德律师事务所
};

// 服务与律所的绑定关系
// 格式: { 服务标题关键词: [律所key数组] }
const SERVICE_FIRM_MAPPING = {
  // 华夏律师事务所的服务
  '公司上市': ['huaxia'],
  '并购重组': ['huaxia'],
  '股权激励': ['huaxia'],
  '公司法律顾问': ['huaxia'],
  '资本市场': ['huaxia'],
  '合规咨询': ['huaxia'],

  // 瀚海律师事务所的服务
  '商事诉讼': ['hisea'],
  '商业诉讼': ['hisea'],
  '国际仲裁': ['hisea'],
  '知识产权维权': ['hisea'],
  '知识产权保护': ['hisea'],
  '数据合规审查': ['hisea', 'mingde'],  // 多家律所提供
  '合同纠纷': ['hisea'],
  '跨境争议': ['hisea'],

  // 明德律师事务所的服务
  '创业公司': ['mingde'],
  '初创企业': ['mingde'],
  '风险投资': ['mingde'],
  '融资并购': ['mingde'],
  '互联网平台': ['mingde'],
  '数据跨境': ['mingde'],
  '劳动法律': ['mingde'],
  'ESOP': ['mingde']
};

// 律所的服务列表（用于更新律所的 services 字段）
const FIRM_SERVICES = {
  huaxia: [
    '公司上市法律服务',
    '并购重组法律顾问',
    '股权激励方案设计',
    '公司法律顾问',
    '资本市场服务',
    '合规咨询'
  ],
  hisea: [
    '商事诉讼代理',
    '国际仲裁服务',
    '知识产权维权诉讼',
    '数据合规审查',
    '合同纠纷解决',
    '跨境争议解决'
  ],
  mingde: [
    '创业公司股权架构设计',
    '风险投资交易法律服务',
    '互联网平台合规咨询',
    '数据跨境传输合规方案',
    'ESOP员工持股计划',
    '初创企业法律顾问'
  ]
};

async function bindServicesToFirms() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('正在连接到 MongoDB...');
    await client.connect();
    console.log('✅ MongoDB 连接成功\n');

    const db = client.db();
    const firmsCollection = db.collection('firms');
    const servicesCollection = db.collection('services');

    // 1. 先查看现有的律所和服务
    console.log('========== 第一步：查看现有数据 ==========\n');

    const firms = await firmsCollection.find({}).toArray();
    console.log(`找到 ${firms.length} 个律所：`);
    firms.forEach(firm => {
      console.log(`  - ${firm.name} (${firm._id})`);
      console.log(`    现有服务: ${firm.services?.length || 0} 个`);
    });
    console.log('');

    const services = await servicesCollection.find({}).toArray();
    console.log(`找到 ${services.length} 个服务：`);
    services.forEach(service => {
      console.log(`  - ${service.title}`);
      console.log(`    当前绑定律所: ${service.law_firm_id || service.firm_id || '未绑定'}`);
    });
    console.log('\n');

    // 2. 更新服务的 law_firm_id 字段
    console.log('========== 第二步：绑定服务到律所 ==========\n');

    let bindCount = 0;
    let updateCount = 0;

    for (const service of services) {
      let firmKeys = [];

      // 根据服务标题匹配律所
      for (const [keyword, firms] of Object.entries(SERVICE_FIRM_MAPPING)) {
        if (service.title.includes(keyword)) {
          firmKeys = firms;
          break;
        }
      }

      if (firmKeys.length === 0) {
        console.log(`⚠️  未找到匹配的律所: ${service.title}`);
        continue;
      }

      // 使用第一个匹配的律所
      const firmKey = firmKeys[0];
      const firmId = new ObjectId(FIRM_IDS[firmKey]);

      // 更新服务的 law_firm_id
      const result = await servicesCollection.updateOne(
        { _id: service._id },
        { $set: { law_firm_id: firmId } }
      );

      if (result.modifiedCount > 0) {
        updateCount++;
        console.log(`✅ 已绑定: ${service.title} -> ${firmKey}`);
      } else {
        bindCount++;
        console.log(`ℹ️  已是最新: ${service.title} -> ${firmKey}`);
      }
    }

    console.log(`\n更新统计: ${updateCount} 个服务已更新, ${bindCount} 个无需更新\n`);

    // 3. 更新律所的 services 字段
    console.log('========== 第三步：更新律所的服务列表 ==========\n');

    for (const [firmKey, serviceList] of Object.entries(FIRM_SERVICES)) {
      const firmId = new ObjectId(FIRM_IDS[firmKey]);

      const result = await firmsCollection.updateOne(
        { _id: firmId },
        { $set: { services: serviceList } }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ 已更新 ${firmKey} 的服务列表 (${serviceList.length} 个服务)`);
      } else {
        console.log(`ℹ️  ${firmKey} 的服务列表已是最新`);
      }
    }
    console.log('');

    // 4. 验证结果
    console.log('========== 第四步：验证绑定结果 ==========\n');

    for (const [firmKey, firmId] of Object.entries(FIRM_IDS)) {
      const firm = await firmsCollection.findOne({ _id: new ObjectId(firmId) });
      const firmServices = await servicesCollection.find({
        law_firm_id: new ObjectId(firmId)
      }).toArray();

      console.log(`${firm.name}:`);
      console.log(`  - services 字段: ${firm.services?.length || 0} 个`);
      firm.services?.forEach(s => console.log(`    ✓ ${s}`));
      console.log(`  - 绑定的服务记录: ${firmServices.length} 个`);
      firmServices.forEach(s => console.log(`    → ${s.title}`));
      console.log('');
    }

    console.log('✅ 服务绑定完成！');

  } catch (error) {
    console.error('❌ 绑定失败:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB 连接已关闭');
  }
}

// 运行绑定
bindServicesToFirms();
