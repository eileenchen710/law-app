const { sendNotificationEmails, __private__ } = require('../../_lib/mailer');
const connectToDatabase = require('../../_lib/db-optimized');
const { authenticateRequest } = require('../../_lib/auth');
const Consultation = require('../../models/consultation');
const Firm = require('../../models/firm');
const Service = require('../../models/service');

const { escapeHtml, formatAppointmentTime } = __private__;

const buildAdminHtml = ({
  name,
  email,
  phone,
  serviceName,
  firmName,
  message,
  preferredTime
}) => {
  const formattedTime = preferredTime
    ? formatAppointmentTime(preferredTime)
    : '未提供';

  return `
    <h2>新咨询请求通知</h2>
    <p>您收到一条新的在线咨询申请，请及时跟进。</p>

    <h3>客户信息</h3>
    <ul>
      <li>姓名：${escapeHtml(name)}</li>
      <li>邮箱：${escapeHtml(email)}</li>
      <li>电话：${escapeHtml(phone)}</li>
    </ul>

    <h3>咨询详情</h3>
    <ul>
      <li>指定律所：${escapeHtml(firmName || '未指定')}</li>
      <li>咨询服务：${escapeHtml(serviceName || '在线咨询')}</li>
      <li>期望沟通时间：${escapeHtml(formattedTime)}</li>
      <li>问题描述：</li>
    </ul>
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
  `;
};

const buildFirmHtml = ({
  firmName,
  name,
  email,
  phone,
  serviceName,
  message,
  preferredTime
}) => {
  const formattedTime = preferredTime
    ? formatAppointmentTime(preferredTime)
    : '未提供';

  return `
    <h2>新客户咨询通知 - ${escapeHtml(firmName)}</h2>
    <p>您收到一条来自法律咨询平台的客户咨询请求。</p>

    <h3>客户信息</h3>
    <ul>
      <li>姓名：${escapeHtml(name)}</li>
      <li>邮箱：${escapeHtml(email)}</li>
      <li>电话：${escapeHtml(phone)}</li>
    </ul>

    <h3>咨询详情</h3>
    <ul>
      <li>咨询服务：${escapeHtml(serviceName || '在线咨询')}</li>
      <li>期望沟通时间：${escapeHtml(formattedTime)}</li>
      <li>问题描述：</li>
    </ul>
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>

    <p style="margin-top: 20px; color: #666;">请尽快联系客户，提供专业的法律服务。</p>
  `;
};

const buildClientHtml = ({
  name,
  serviceName,
  preferredTime
}) => {
  const formattedTime = preferredTime
    ? formatAppointmentTime(preferredTime)
    : null;

  return `
    <h2>咨询申请已收到</h2>
    <p>尊敬的${escapeHtml(name || '客户')}：</p>
    <p>我们已收到您的在线咨询申请，将在 1-2 个工作日内由专业顾问联系您确认详情。</p>

    <h3>咨询信息</h3>
    <ul>
      <li>咨询服务：${escapeHtml(serviceName || '在线咨询')}</li>
      ${formattedTime ? `<li>期望沟通时间：${escapeHtml(formattedTime)}</li>` : ''}
    </ul>

    <p>感谢您的信任，如需补充信息可以直接回复本邮件。</p>
  `;
};

// Handle GET - Get all appointments (admin only)
const handleGetAppointments = async (req, res) => {
  const authResult = await authenticateRequest(req, { requireAuth: true });
  if (authResult.error || !authResult.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: '需要登录'
    });
  }

  // Check if user is admin
  if (authResult.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: '只有管理员可以查看所有预约'
    });
  }

  try {
    await connectToDatabase();

    const { page = 1, size = 100, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const [total, consultations] = await Promise.all([
      Consultation.countDocuments(query),
      Consultation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const items = consultations.map((consultation) => ({
      id: consultation._id.toString(),
      user_id: consultation.user_id?.toString() || null,
      name: consultation.name,
      phone: consultation.phone,
      email: consultation.email,
      firm_id: consultation.firm_id?.toString() || null,
      firm_name: consultation.firm_name || null,
      service_id: consultation.service_id?.toString() || null,
      service_name: consultation.service_name || '在线咨询',
      time: consultation.preferred_time || consultation.createdAt,
      remark: consultation.message,
      status: consultation.status,
      created_at: consultation.createdAt
    }));

    return res.status(200).json({
      items,
      total,
      page: parseInt(page),
      size: parseInt(size),
      pages: Math.ceil(total / parseInt(size))
    });
  } catch (error) {
    console.error('[consultations] Failed to get appointments:', error);
    return res.status(500).json({
      error: 'Failed to get appointments',
      details: error.message
    });
  }
};

// Build cancellation email for admin
const buildCancellationAdminHtml = ({
  name,
  email,
  phone,
  serviceName,
  firmName,
  appointmentTime,
  cancelledBy
}) => {
  return `
    <h2>预约取消通知</h2>
    <p>一个预约已被取消。</p>

    <h3>客户信息</h3>
    <ul>
      <li>姓名：${escapeHtml(name)}</li>
      <li>邮箱：${escapeHtml(email)}</li>
      <li>电话：${escapeHtml(phone)}</li>
    </ul>

    <h3>预约详情</h3>
    <ul>
      <li>指定律所：${escapeHtml(firmName || '未指定')}</li>
      <li>咨询服务：${escapeHtml(serviceName || '在线咨询')}</li>
      <li>预约时间：${escapeHtml(formatAppointmentTime(appointmentTime))}</li>
      <li>取消方：${escapeHtml(cancelledBy)}</li>
    </ul>
  `;
};

// Build cancellation email for client
const buildCancellationClientHtml = ({
  name,
  serviceName,
  appointmentTime
}) => {
  return `
    <h2>预约已取消</h2>
    <p>尊敬的${escapeHtml(name || '客户')}：</p>
    <p>您的预约已被取消。</p>

    <h3>预约信息</h3>
    <ul>
      <li>咨询服务：${escapeHtml(serviceName || '在线咨询')}</li>
      <li>预约时间：${escapeHtml(formatAppointmentTime(appointmentTime))}</li>
    </ul>

    <p>如有疑问，请联系我们。如需重新预约，欢迎访问我们的平台。</p>
  `;
};

// Build cancellation email for firm
const buildCancellationFirmHtml = ({
  firmName,
  name,
  email,
  phone,
  serviceName,
  appointmentTime
}) => {
  return `
    <h2>客户预约取消通知 - ${escapeHtml(firmName)}</h2>
    <p>一位客户的预约已被取消。</p>

    <h3>客户信息</h3>
    <ul>
      <li>姓名：${escapeHtml(name)}</li>
      <li>邮箱：${escapeHtml(email)}</li>
      <li>电话：${escapeHtml(phone)}</li>
    </ul>

    <h3>预约详情</h3>
    <ul>
      <li>咨询服务：${escapeHtml(serviceName || '在线咨询')}</li>
      <li>预约时间：${escapeHtml(formatAppointmentTime(appointmentTime))}</li>
    </ul>
  `;
};

// Handle PATCH - Update appointment status
const handleUpdateAppointment = async (req, res) => {
  const authResult = await authenticateRequest(req, { requireAuth: true });
  if (authResult.error || !authResult.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: '需要登录'
    });
  }

  try {
    await connectToDatabase();

    // Get appointment ID from URL
    const urlParts = req.url.split('/').filter(Boolean);
    const appointmentId = urlParts[urlParts.length - 1].split('?')[0];

    if (!appointmentId) {
      return res.status(400).json({ error: 'Missing appointment ID' });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing status field' });
    }

    // Validate status
    const validStatuses = ['pending', 'contacted', 'converted', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    // Find the appointment
    const appointment = await Consultation.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check permission: user can only update their own appointments
    // Admin can update any appointment
    const userId = authResult.user._id.toString();
    const appointmentUserId = appointment.user_id?.toString();
    const isAdmin = authResult.user.role === 'admin';

    if (!isAdmin && appointmentUserId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '只能取消自己的预约'
      });
    }

    const oldStatus = appointment.status;

    // Update status
    appointment.status = status;
    await appointment.save();

    console.log('[consultations] Updated appointment:', appointmentId, 'status:', status);

    // Send email notifications if status changed to cancelled
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      try {
        // Get firm information if available
        let firmEmail = null;
        let firmName = null;

        if (appointment.firm_id) {
          const firm = await Firm.findById(appointment.firm_id).lean();
          if (firm) {
            firmEmail = firm.contact_email || firm.email;
            firmName = firm.name;
          }
        }

        const appointmentTime = appointment.preferred_time || appointment.createdAt;
        const cancelledBy = isAdmin ? '管理员' : '用户本人';

        // Prepare email configuration
        const emailConfig = {
          admin: {
            subject: `预约取消 - ${appointment.name}`,
            html: buildCancellationAdminHtml({
              name: appointment.name,
              email: appointment.email,
              phone: appointment.phone,
              serviceName: appointment.service_name,
              firmName: firmName || appointment.firm_name,
              appointmentTime,
              cancelledBy
            })
          },
          client: {
            to: appointment.email,
            subject: `预约取消确认`,
            html: buildCancellationClientHtml({
              name: appointment.name,
              serviceName: appointment.service_name,
              appointmentTime
            })
          }
        };

        // Add firm email if available
        if (firmEmail && firmName) {
          emailConfig.firm = {
            to: firmEmail,
            subject: `客户预约取消 - ${appointment.name}`,
            html: buildCancellationFirmHtml({
              firmName,
              name: appointment.name,
              email: appointment.email,
              phone: appointment.phone,
              serviceName: appointment.service_name,
              appointmentTime
            })
          };
        }

        // Send emails
        await sendNotificationEmails(emailConfig, { silent: true });
        console.log('[consultations] Cancellation emails sent for appointment:', appointmentId);
      } catch (emailError) {
        console.error('[consultations] Failed to send cancellation emails:', emailError);
        // Don't fail the request if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: '预约状态已更新',
      appointment: {
        id: appointment._id.toString(),
        status: appointment.status
      }
    });
  } catch (error) {
    console.error('[consultations] Failed to update appointment:', error);
    return res.status(500).json({
      error: 'Failed to update appointment',
      details: error.message
    });
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET - Get all appointments (admin only)
  if (req.method === 'GET') {
    return await handleGetAppointments(req, res);
  }

  // Handle PATCH - Update appointment (cancel)
  if (req.method === 'PATCH') {
    return await handleUpdateAppointment(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证用户身份（要求必须登录）
  const authResult = await authenticateRequest(req, { requireAuth: true });
  if (authResult.error || !authResult.user) {
    console.log('[consultations] Authentication failed:', authResult.error);
    return res.status(401).json({
      error: 'Authentication required',
      message: '创建预约需要先登录'
    });
  }

  const userId = authResult.user._id.toString();
  console.log('[consultations] Authenticated user:', userId);

  const {
    name,
    email,
    phone,
    serviceName,
    message,
    preferredTime,
    firmId,
    serviceId,
  } = req.body || {};

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
  const trimmedService = typeof serviceName === 'string' ? serviceName.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  const missingFields = [];

  if (!trimmedName) missingFields.push('name');
  if (!trimmedEmail) missingFields.push('email');
  if (!trimmedPhone) missingFields.push('phone');
  if (!trimmedMessage) missingFields.push('message');

  if (missingFields.length) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: missingFields,
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const phoneRegex = /^\+?[0-9\-\s]{6,16}$/;
  if (!phoneRegex.test(trimmedPhone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  // Keep preferredTime as string for better display in emails
  // Only convert to Date for database storage
  let appointmentTimeForDb = null;
  if (preferredTime) {
    const candidate = new Date(preferredTime);
    if (!Number.isNaN(candidate.getTime())) {
      appointmentTimeForDb = candidate;
    }
  }

  try {
    // 连接数据库
    await connectToDatabase();

    // 查询律所和服务信息
    let firm = null;
    let service = null;
    let firmEmail = null;

    const firmPromise = firmId ? Firm.findById(firmId).lean() : null;
    const servicePromise = serviceId ? Service.findById(serviceId).lean() : null;

    const [firmResult, serviceResult] = await Promise.all([firmPromise, servicePromise]);
    firm = firmResult;
    service = serviceResult;

    if (firm) {
      firmEmail = firm.contact_email || firm.email;
    }

    if (service && service.firm_id && !firm) {
      firm = await Firm.findById(service.firm_id).lean();
      if (firm) {
        firmEmail = firm.contact_email || firm.email;
      }
    }

    const firmName = firm ? firm.name : null;
    const actualServiceName = service ? service.title : (trimmedService || '在线咨询');

    // 创建咨询记录（包含用户ID）
    const consultation = await Consultation.create({
      user_id: userId,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      service_name: actualServiceName,
      message: trimmedMessage,
      preferred_time: appointmentTimeForDb,
      status: 'pending',
      firm_id: firmId || (firm ? firm._id.toString() : null),
      firm_name: firmName,
      service_id: serviceId || (service ? service._id.toString() : null)
    });

    console.log('[consultations] Created consultation record:', consultation._id, 'for user:', userId);

    // 准备邮件配置
    const emailConfig = {
      admin: {
        subject: `新在线咨询 - ${trimmedName}`,
        html: buildAdminHtml({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          serviceName: actualServiceName,
          firmName: firmName,
          message: trimmedMessage,
          preferredTime: preferredTime || null
        })
      },
      client: {
        to: trimmedEmail,
        subject: `咨询确认 - ${actualServiceName}`,
        html: buildClientHtml({
          name: trimmedName,
          serviceName: actualServiceName,
          preferredTime: preferredTime || null
        })
      }
    };

    // 如果有律所邮箱，添加律所邮件
    if (firmEmail && firmName) {
      emailConfig.firm = {
        to: firmEmail,
        subject: `新客户咨询 - ${trimmedName}`,
        html: buildFirmHtml({
          firmName: firmName,
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          serviceName: actualServiceName,
          message: trimmedMessage,
          preferredTime: preferredTime || null
        })
      };
    }

    // 发送邮件通知（在后台异步执行，加快响应速度）
    sendNotificationEmails(emailConfig, { silent: false }).catch((error) => {
      console.error('[consultations] Failed to send notification emails', error);
    });

    return res.status(200).json({
      status: 'ok',
      message: '咨询已提交，我们会尽快与您联系',
      consultationId: consultation._id,
      emailSummary: 'queued',
    });
  } catch (error) {
    console.error('[consultations] Failed to process consultation', error);
    return res.status(500).json({
      error: 'Failed to submit consultation',
      details: error.message,
    });
  }
};
