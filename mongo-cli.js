require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const readline = require('readline');

// 创建控制台输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let db = null;

async function connectToMongoDB() {
  try {
    const { MONGODB_URI, MONGODB_DB } = process.env;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI 环境变量未设置');
      return false;
    }

    console.log('🔌 正在连接到 MongoDB...');
    console.log(`📡 URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    console.log(`🗃️  数据库: ${MONGODB_DB || '默认'}`);
    
    const options = {
      bufferCommands: false,
      dbName: MONGODB_DB,
    };

    await mongoose.connect(MONGODB_URI, options);
    db = mongoose.connection.db;
    console.log('✅ 成功连接到 MongoDB!');
    
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    return false;
  }
}

function showHelp() {
  console.log(`
📚 MongoDB 命令帮助:
  show collections     - 显示所有集合
  show dbs            - 显示所有数据库  
  use <dbname>        - 切换数据库
  db.<collection>.find()                    - 查看集合中的所有文档
  db.<collection>.findOne()                 - 查看集合中的一个文档
  db.<collection>.countDocuments()          - 统计文档数量
  db.<collection>.find({field: "value"})    - 按条件查询
  
🔍 示例命令:
  db.firms.find()                          - 查看所有律所
  db.firms.findOne()                       - 查看一个律所
  db.appointments.countDocuments()         - 统计预约数量
  
⚡ 特殊命令:
  help                - 显示帮助
  exit 或 quit        - 退出程序
  clear               - 清屏
`);
}

async function executeCommand(command) {
  const cmd = command.trim();
  
  if (!cmd) return;
  
  // 特殊命令处理
  if (cmd === 'help') {
    showHelp();
    return;
  }
  
  if (cmd === 'exit' || cmd === 'quit') {
    console.log('👋 再见!');
    process.exit(0);
  }
  
  if (cmd === 'clear') {
    console.clear();
    return;
  }
  
  try {
    // 显示集合
    if (cmd === 'show collections') {
      const collections = await db.listCollections().toArray();
      console.log('📋 集合列表:');
      collections.forEach(col => console.log(`  - ${col.name}`));
      return;
    }
    
    // 显示数据库
    if (cmd === 'show dbs') {
      const admin = db.admin();
      const dbs = await admin.listDatabases();
      console.log('🗄️  数据库列表:');
      dbs.databases.forEach(db => console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`));
      return;
    }
    
    // 执行查询命令
    if (cmd.startsWith('db.')) {
      // 解析命令
      const match = cmd.match(/db\.(\w+)\.(\w+)\((.*)\)/);
      if (match) {
        const [, collectionName, method, params] = match;
        const collection = db.collection(collectionName);
        
        let result;
        switch (method) {
          case 'find':
            if (params.trim()) {
              // 有参数的查询
              const query = eval(`(${params})`);
              result = await collection.find(query).toArray();
            } else {
              // 无参数的查询
              result = await collection.find().toArray();
            }
            console.log(`📄 查询结果 (${result.length} 条记录):`);
            result.forEach((doc, index) => {
              console.log(`${index + 1}. ${JSON.stringify(doc, null, 2)}`);
            });
            break;
            
          case 'findOne':
            if (params.trim()) {
              const query = eval(`(${params})`);
              result = await collection.findOne(query);
            } else {
              result = await collection.findOne();
            }
            console.log('📄 查询结果:');
            console.log(JSON.stringify(result, null, 2));
            break;
            
          case 'countDocuments':
            if (params.trim()) {
              const query = eval(`(${params})`);
              result = await collection.countDocuments(query);
            } else {
              result = await collection.countDocuments();
            }
            console.log(`📊 文档数量: ${result}`);
            break;
            
          default:
            console.log(`❌ 不支持的方法: ${method}`);
        }
      } else {
        console.log('❌ 命令格式不正确。请使用 help 查看帮助。');
      }
      return;
    }
    
    console.log('❌ 不认识的命令。请使用 help 查看帮助。');
    
  } catch (error) {
    console.error('❌ 执行命令时出错:', error.message);
  }
}

async function startCLI() {
  console.log('🚀 MongoDB CLI 工具启动');
  console.log('输入 help 查看帮助，输入 exit 退出\n');
  
  const connected = await connectToMongoDB();
  if (!connected) {
    process.exit(1);
  }
  
  showHelp();
  
  // 开始交互循环
  function prompt() {
    rl.question('mongosh> ', async (input) => {
      await executeCommand(input);
      prompt();
    });
  }
  
  prompt();
}

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n👋 再见!');
  mongoose.connection.close();
  process.exit(0);
});

startCLI();