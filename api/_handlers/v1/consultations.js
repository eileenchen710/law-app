const { sendNotificationEmails, __private__ } = require('../../_lib/mailer');
const connectToDatabase = require('../../_lib/db-optimized');
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  let appointmentTime = new Date();
  if (preferredTime) {
    const candidate = new Date(preferredTime);
    if (!Number.isNaN(candidate.getTime())) {
      appointmentTime = candidate;
    }
  }

  try {
    // 连接数据库
    await connectToDatabase();

    // 查询律所和服务信息
    let firm = null;
    let service = null;
    let firmEmail = null;

    if (firmId) {
      firm = await Firm.findById(firmId).lean();
      if (firm) {
        firmEmail = firm.contact_email || firm.email;
      }
    }

    if (serviceId) {
      service = await Service.findById(serviceId).lean();
      if (service && service.firm_id && !firm) {
        // 如果通过服务找到律所，也获取律所信息
        firm = await Firm.findById(service.firm_id).lean();
        if (firm) {
          firmEmail = firm.contact_email || firm.email;
        }
      }
    }

    const firmName = firm ? firm.name : null;
    const actualServiceName = service ? service.title : (trimmedService || '在线咨询');

    // 创建咨询记录
    const consultation = await Consultation.create({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      service_name: actualServiceName,
      message: trimmedMessage,
      preferred_time: preferredTime ? appointmentTime : null,
      status: 'pending'
    });

    console.log('[consultations] Created consultation record:', consultation._id);

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
          preferredTime: appointmentTime
        })
      },
      client: {
        to: trimmedEmail,
        subject: `咨询确认 - ${actualServiceName}`,
        html: buildClientHtml({
          name: trimmedName,
          serviceName: actualServiceName,
          preferredTime: preferredTime ? appointmentTime : null
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
          preferredTime: appointmentTime
        })
      };
    }

    // 发送邮件通知
    const summary = await sendNotificationEmails(emailConfig, { silent: false });

    return res.status(200).json({
      status: 'ok',
      message: '咨询已提交，我们会尽快与您联系',
      consultationId: consultation._id,
      emailSummary: summary,
    });
  } catch (error) {
    console.error('[consultations] Failed to process consultation', error);
    return res.status(500).json({
      error: 'Failed to submit consultation',
      details: error.message,
    });
  }
};
