const nodemailer = require('nodemailer');

const DEFAULT_NOTIFICATION_EMAIL = 'info@fudulegal.com';

let cachedTransporter;

const isTruthy = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const parseEmailList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (item ?? '').toString().trim())
      .filter(Boolean);
  }
  return value
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const escapeHtml = (value) => {
  if (value === undefined || value === null) {
    return '';
  }
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getEmailSender = () => {
  const { EMAIL_FROM, EMAIL_USER } = process.env;
  return EMAIL_FROM || EMAIL_USER || 'no-reply@law-app.local';
};

const getNotificationRecipients = (additionalRecipients = []) => {
  const envList =
    process.env.NOTIFICATION_EMAILS ||
    process.env.ADMIN_EMAIL ||
    DEFAULT_NOTIFICATION_EMAIL;

  const recipients = new Set([
    ...parseEmailList(envList),
    ...parseEmailList(additionalRecipients)
  ]);

  return Array.from(recipients);
};

const normalizeRecipients = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(parseEmailList);
  }
  return parseEmailList(value);
};

const createTransportFromEnv = () => {
  const transportMode = (process.env.EMAIL_TRANSPORT || '').trim().toLowerCase();

  if (transportMode === 'json') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (transportMode === 'stream') {
    return nodemailer.createTransport({
      streamTransport: true,
      buffer: true
    });
  }

  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_REQUIRE_TLS,
    EMAIL_TLS_REJECT_UNAUTHORIZED
  } = process.env;

  const transportOptions = {};

  if (EMAIL_SERVICE) {
    transportOptions.service = EMAIL_SERVICE;
  }

  if (EMAIL_HOST) {
    transportOptions.host = EMAIL_HOST;
  }

  const port = parseNumber(EMAIL_PORT);
  if (port !== undefined) {
    transportOptions.port = port;
  }

  if (EMAIL_SECURE !== undefined) {
    transportOptions.secure = isTruthy(EMAIL_SECURE);
  }

  if (EMAIL_USER || EMAIL_PASS) {
    transportOptions.auth = {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    };
  }

  if (EMAIL_REQUIRE_TLS !== undefined) {
    transportOptions.requireTLS = isTruthy(EMAIL_REQUIRE_TLS);
  }

  if (EMAIL_TLS_REJECT_UNAUTHORIZED !== undefined) {
    transportOptions.tls = {
      rejectUnauthorized: isTruthy(EMAIL_TLS_REJECT_UNAUTHORIZED)
    };
  }

  if (!Object.keys(transportOptions).length) {
    return null;
  }

  return nodemailer.createTransport(transportOptions);
};

const getTransporter = () => {
  if (cachedTransporter === undefined) {
    cachedTransporter = createTransportFromEnv();
  }
  return cachedTransporter;
};

const formatAppointmentTime = (appointmentTime) => {
  // If it's already a formatted string (not a Date object), return as is
  if (typeof appointmentTime === 'string') {
    return appointmentTime;
  }

  // If it's not a valid Date object, return the string representation
  if (!(appointmentTime instanceof Date) || isNaN(appointmentTime.getTime())) {
    return String(appointmentTime);
  }

  const locale = process.env.EMAIL_LOCALE || 'zh-CN';
  const timeZone = process.env.EMAIL_TIMEZONE;

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(appointmentTime);
  } catch (error) {
    console.warn('[mailer] Failed to format appointment time:', error.message);
    return appointmentTime.toISOString();
  }
};

const buildNotificationHtml = ({
  clientName,
  clientPhone,
  clientEmail,
  firmName,
  serviceName,
  appointmentTime,
  remark
}) => {
  const formattedTime = formatAppointmentTime(new Date(appointmentTime));

  return `
    <h2>新预约通知</h2>
    <h3>客户信息</h3>
    <ul>
      <li>姓名：${escapeHtml(clientName)}</li>
      <li>电话：${escapeHtml(clientPhone)}</li>
      <li>邮箱：${escapeHtml(clientEmail || '未提供')}</li>
    </ul>

    <h3>预约详情</h3>
    <ul>
      <li>律所：${escapeHtml(firmName)}</li>
      <li>服务：${escapeHtml(serviceName)}</li>
      <li>预约时间：${escapeHtml(formattedTime)}</li>
      <li>备注：${escapeHtml(remark || '无')}</li>
    </ul>

    <p>请及时联系客户确认预约。</p>
  `;
};

const buildClientHtml = ({
  clientName,
  firmName,
  serviceName,
  appointmentTime
}) => {
  const formattedTime = formatAppointmentTime(new Date(appointmentTime));

  return `
    <h2>预约确认</h2>
    <p>尊敬的${escapeHtml(clientName || '客户')}，您的预约已成功提交。</p>

    <h3>预约详情</h3>
    <ul>
      <li>律所：${escapeHtml(firmName)}</li>
      <li>服务：${escapeHtml(serviceName)}</li>
      <li>预约时间：${escapeHtml(formattedTime)}</li>
    </ul>

    <p>律所将会尽快与您联系确认预约。如有任何问题，请联系律所。</p>
    <p>谢谢！</p>
  `;
};

const sendMailSafely = async (transporter, mailOptions, { silent = false } = {}) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    if (!silent) {
      console.log(`[mailer] Email sent to ${mailOptions.to}`);
    }
    return {
      status: 'fulfilled',
      to: mailOptions.to,
      info
    };
  } catch (error) {
    if (!silent) {
      console.error(`[mailer] Failed to send email to ${mailOptions.to}:`, error);
    }
    return {
      status: 'rejected',
      to: mailOptions.to,
      error
    };
  }
};

async function sendNotificationEmails(config = {}, options = {}) {
  const { admin, client, additionalRecipients = [] } = config;

  const transporter = Object.prototype.hasOwnProperty.call(options, 'transporter')
    ? options.transporter
    : getTransporter();
  const silent = options.silent === true;

  const summary = {
    notifications: [],
    clientConfirmation: null
  };

  if (!transporter) {
    if (!silent) {
      console.warn('[mailer] Email transporter not configured. Skipping email delivery.');
    }
    return summary;
  }

  if (admin && admin.subject && admin.html) {
    const recipients = admin.to?.length
      ? normalizeRecipients(admin.to)
      : getNotificationRecipients(additionalRecipients);

    const uniqueRecipients = Array.from(new Set(recipients));

    if (uniqueRecipients.length) {
      const baseMail = {
        from: admin.from || getEmailSender(),
        subject: admin.subject,
        html: admin.html
      };

      const tasks = uniqueRecipients.map((recipient) =>
        sendMailSafely(
          transporter,
          {
            ...baseMail,
            to: recipient
          },
          { silent }
        )
      );

      summary.notifications = await Promise.all(tasks);
    }
  }

  if (client && client.subject && client.html && client.to) {
    const clientRecipients = normalizeRecipients(client.to);
    const [primaryRecipient] = clientRecipients;

    if (primaryRecipient) {
      const clientMail = {
        from: client.from || getEmailSender(),
        to: primaryRecipient,
        subject: client.subject,
        html: client.html
      };

      summary.clientConfirmation = await sendMailSafely(transporter, clientMail, { silent });
    }
  }

  return summary;
}

async function sendAppointmentNotification(appointmentData, options = {}) {
  const {
    clientName,
    clientPhone,
    clientEmail,
    firmName,
    firmEmail,
    serviceName,
    appointmentTime,
    remark
  } = appointmentData;

  return sendNotificationEmails(
    {
      admin: {
        subject: `新预约通知 - ${clientName || '未知客户'} - ${serviceName || '未指定服务'}`,
        html: buildNotificationHtml({
          clientName,
          clientPhone,
          clientEmail,
          firmName,
          serviceName,
          appointmentTime,
          remark
        })
      },
      client: clientEmail
        ? {
            to: clientEmail,
            subject: `预约确认 - ${firmName || '律所'} - ${serviceName || '服务'}`,
            html: buildClientHtml({
              clientName,
              firmName,
              serviceName,
              appointmentTime
            })
          }
        : undefined,
      additionalRecipients: firmEmail ? [firmEmail] : []
    },
    options
  );
}

module.exports = {
  sendNotificationEmails,
  sendAppointmentNotification,
  __private__: {
    createTransportFromEnv,
    getNotificationRecipients,
    getEmailSender,
    formatAppointmentTime,
    escapeHtml
  }
};
