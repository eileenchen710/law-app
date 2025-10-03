const mongoose = require('mongoose');
const connectToDatabase = require('../api/_lib/db');
const Firm = require('../api/models/firm');
const Service = require('../api/models/service');
const Appointment = require('../api/models/appointment');

async function seedDatabase() {
  try {
    console.log('连接到 MongoDB...');
    await connectToDatabase();

    console.log('清理现有数据...');
    await Firm.deleteMany({});
    await Service.deleteMany({});
    await Appointment.deleteMany({});

    console.log('插入示例律所数据...');
    
    // 插入示例律所
    const firms = await Firm.create([
      {
        name: '北京盈科律师事务所',
        slug: 'beijing-yingke',
        description: '专注于公司法务、知识产权、婚姻家事等领域',
        address: '北京市朝阳区金和东路20号院正大中心2号楼',
        city: '北京',
        contact_email: 'contact@yingke.com',
        contact_phone: '010-59626911',
        phone: '010-59626911',
        email: 'contact@yingke.com',
        website: 'http://www.yingkelaw.com',
        practiceAreas: ['公司法务', '知识产权', '婚姻家事'],
        tags: ['大型律所', '综合性'],
        available_times: generateAvailableTimes(7)
      },
      {
        name: '上海申达律师事务所',
        slug: 'shanghai-shenda',
        description: '专业处理劳动纠纷、合同纠纷、房产纠纷',
        address: '上海市浦东新区浦东南路528号',
        city: '上海',
        contact_email: 'info@shenda.com',
        contact_phone: '021-58788888',
        phone: '021-58788888',
        email: 'info@shenda.com',
        practiceAreas: ['劳动纠纷', '合同纠纷', '房产纠纷'],
        tags: ['专业化', '高效'],
        available_times: generateAvailableTimes(7)
      },
      {
        name: '深圳华商律师事务所',
        slug: 'shenzhen-huashang',
        description: '专注于企业并购、投融资、税务筹划',
        address: '深圳市福田区深南大道4001号',
        city: '深圳',
        contact_email: 'service@huashang.com',
        contact_phone: '0755-83025555',
        phone: '0755-83025555',
        email: 'service@huashang.com',
        website: 'http://www.huashanglaw.com',
        practiceAreas: ['企业并购', '投融资', '税务筹划'],
        tags: ['商事', '资本市场'],
        available_times: generateAvailableTimes(7)
      }
    ]);
    
    console.log(`插入了 ${firms.length} 个律所`);

    // 为每个律所插入服务
    const services = [];
    for (const firm of firms) {
      const firmServices = [
        {
          firm_id: firm._id,
          title: '婚姻家事咨询',
          description: '离婚诉讼、财产分割、子女抚养权纠纷等',
          category: '民事',
          price: 500,
          status: 'active',
          available_times: generateAvailableTimes(14)
        },
        {
          firm_id: firm._id,
          title: '劳动仲裁咨询',
          description: '劳动合同纠纷、工伤赔偿、解雇补偿等',
          category: '劳动',
          price: 300,
          status: 'active',
          available_times: generateAvailableTimes(14)
        },
        {
          firm_id: firm._id,
          title: '合同审查服务',
          description: '合同起草、审查、修改，风险防控建议',
          category: '商事',
          price: 800,
          status: 'active',
          available_times: generateAvailableTimes(14)
        },
        {
          firm_id: firm._id,
          title: '知识产权保护',
          description: '商标注册、专利申请、版权保护、侵权诉讼',
          category: '知识产权',
          price: 1000,
          status: 'active',
          available_times: generateAvailableTimes(14)
        }
      ];
      
      const createdServices = await Service.create(firmServices);
      services.push(...createdServices);
      console.log(`为 ${firm.name} 插入了 ${createdServices.length} 个服务`);
    }

    // 插入几个示例预约
    const sampleAppointments = [
      {
        name: '张先生',
        phone: '13800138001',
        email: 'zhang@example.com',
        firm_id: firms[0]._id,
        service_id: services[0]._id,
        appointment_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
        remark: '想咨询离婚财产分割问题',
        status: 'pending'
      },
      {
        name: '李女士',
        phone: '13900139002',
        email: 'li@example.com',
        firm_id: firms[1]._id,
        service_id: services[5]._id,
        appointment_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后
        remark: '劳动合同纠纷，需要法律援助',
        status: 'confirmed'
      }
    ];

    const appointments = await Appointment.create(sampleAppointments);
    console.log(`插入了 ${appointments.length} 个示例预约`);

    console.log('\n数据库初始化完成！');
    console.log('========================');
    console.log('总计:');
    console.log(`- ${firms.length} 个律所`);
    console.log(`- ${services.length} 个服务`);
    console.log(`- ${appointments.length} 个预约`);
    
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 生成可用时间段
function generateAvailableTimes(days) {
  const times = [];
  const now = new Date();
  
  for (let day = 1; day <= days; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }
    
    // 上午10点
    const morningTime = new Date(date);
    morningTime.setHours(10, 0, 0, 0);
    times.push(morningTime);
    
    // 下午2点
    const afternoonTime = new Date(date);
    afternoonTime.setHours(14, 0, 0, 0);
    times.push(afternoonTime);
    
    // 下午4点
    const lateAfternoonTime = new Date(date);
    lateAfternoonTime.setHours(16, 0, 0, 0);
    times.push(lateAfternoonTime);
  }
  
  return times;
}

// 运行初始化
seedDatabase();