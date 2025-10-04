const connectToDatabase = require('../../_lib/db-optimized');
const Appointment = require('../../models/appointment');
const Firm = require('../../models/firm');
const Service = require('../../models/service');
const { sendAppointmentNotification } = require('../../_lib/mailer');

module.exports = async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Appointments API: Connecting to database...');
    const dbStartTime = Date.now();
    await connectToDatabase();
    console.log(`Appointments API: Database connected in ${Date.now() - dbStartTime}ms`);

    // GET - 查询预约列表（管理后台用）
    if (req.method === 'GET') {
      const { firm_id, date, page = 1, size = 20 } = req.query;
      
      // 计算分页
      const skip = (parseInt(page) - 1) * parseInt(size);
      const limit = parseInt(size);

      // 构建查询条件
      const query = {};

      if (firm_id) {
        query.firm_id = firm_id;
      }

      if (date) {
        // 查询某一天的预约
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.appointment_time = {
          $gte: startDate,
          $lte: endDate
        };
      }

      // 并行执行计数和查询
      console.log('Appointments API: Executing parallel queries');
      const queryStartTime = Date.now();
      
      const [total, appointments] = await Promise.all([
        Appointment.countDocuments(query),
        Appointment.find(query)
          .populate('firm_id', 'name')
          .populate('service_id', 'title')
          .sort({ appointment_time: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .maxTimeMS(5000)
      ]);
      
      console.log(`Appointments API: Queries completed in ${Date.now() - queryStartTime}ms`);

      // 格式化响应数据
      const items = appointments.map(appointment => ({
        id: `apt-${appointment._id.toString()}`,
        name: appointment.name,
        phone: appointment.phone,
        email: appointment.email,
        firm_id: appointment.firm_id?._id?.toString() || appointment.firm_id,
        firm_name: appointment.firm_id?.name || null,
        service_id: appointment.service_id?._id?.toString() || appointment.service_id,
        service_name: appointment.service_id?.title || null,
        time: new Date(appointment.appointment_time).toISOString(),
        remark: appointment.remark,
        status: appointment.status,
        created_at: new Date(appointment.createdAt).toISOString()
      }));

      return res.status(200).json({
        items,
        total,
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / parseInt(size))
      });
    }

    // POST - 提交新预约
    if (req.method === 'POST') {
      const { 
        name, 
        phone, 
        email, 
        firm_id, 
        service_id, 
        time, 
        remark 
      } = req.body;

      // 验证必填字段
      if (!name || !phone || !firm_id || !service_id || !time) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['name', 'phone', 'firm_id', 'service_id', 'time']
        });
      }

      // 验证手机号格式（中国手机号）
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ 
          error: 'Invalid phone number format'
        });
      }

      // 验证邮箱格式（如果提供）
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ 
            error: 'Invalid email format'
          });
        }
      }

      // 验证预约时间是否在未来
      const appointmentTime = new Date(time);
      if (appointmentTime <= new Date()) {
        return res.status(400).json({ 
          error: 'Appointment time must be in the future'
        });
      }

      // 并行检查律所和服务
      console.log('Appointments API: Validating firm and service');
      const validateStartTime = Date.now();
      
      const [firm, service] = await Promise.all([
        Firm.findById(firm_id)
          .select('name contact_email email')
          .lean()
          .maxTimeMS(2000),
        Service.findOne({ 
          _id: service_id, 
          firm_id: firm_id 
        })
        .select('title available_times')
        .lean()
        .maxTimeMS(2000)
      ]);
      
      console.log(`Appointments API: Validation completed in ${Date.now() - validateStartTime}ms`);
      
      if (!firm) {
        return res.status(404).json({ error: 'Firm not found' });
      }
      
      if (!service) {
        return res.status(404).json({ 
          error: 'Service not found or does not belong to this firm' 
        });
      }

      // 创建预约记录
      const appointment = new Appointment({
        name,
        phone,
        email: email || undefined,
        firm_id,
        service_id,
        appointment_time: appointmentTime,
        remark: remark || undefined,
        status: 'pending'
      });

      const savedAppointment = await appointment.save();

      // 更新服务的可用时间（移除已预约的时间）
      if (service.available_times && service.available_times.length > 0) {
        await Service.updateOne(
          { _id: service_id },
          { 
            $pull: { 
              available_times: appointmentTime 
            } 
          }
        );
      }

      // 发送邮件通知（异步，不阻塞响应）
      sendAppointmentNotification({
        clientName: name,
        clientPhone: phone,
        clientEmail: email,
        firmName: firm.name,
        firmEmail: firm.contact_email || firm.email,
        serviceName: service.title,
        appointmentTime: appointmentTime,
        remark: remark
      }).catch(error => {
        console.error('Failed to send email notification:', error);
      });

      // 返回成功响应
      return res.status(201).json({
        status: 'ok',
        message: '预约提交成功，邮件已发送给律所和管理员',
        appointment_id: `apt-${savedAppointment._id.toString()}`
      });
    }

    // 其他方法不支持
    res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Error handling appointment:', error);
    res.status(500).json({ 
      error: 'Failed to process appointment',
      details: error.message 
    });
  }
};