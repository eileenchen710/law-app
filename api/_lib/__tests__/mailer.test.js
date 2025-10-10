const test = require('node:test');
const assert = require('node:assert');

const { sendAppointmentNotification } = require('../mailer');

const baseAppointment = {
  clientName: '张三',
  clientPhone: '13800138000',
  clientEmail: 'client@example.com',
  firmName: '金桉律师事务所',
  firmEmail: 'contact@firm.com',
  serviceName: '法律咨询',
  appointmentTime: new Date('2025-01-01T10:00:00Z'),
  remark: '请提前联系'
};

const createMockTransporter = () => {
  const sent = [];
  return {
    get sent() {
      return sent;
    },
    async sendMail(options) {
      sent.push(options);
      return {
        accepted: Array.isArray(options.to) ? options.to : [options.to],
        envelope: {
          to: options.to
        }
      };
    }
  };
};

test('sends notifications to firm and default admin email', async () => {
  const transporter = createMockTransporter();

  const originalEnv = {
    NOTIFICATION_EMAILS: process.env.NOTIFICATION_EMAILS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL
  };

  try {
    delete process.env.NOTIFICATION_EMAILS;
    delete process.env.ADMIN_EMAIL;

    const summary = await sendAppointmentNotification(baseAppointment, {
      transporter,
      silent: true
    });

    const recipients = transporter.sent.map((mail) => mail.to).sort();

    assert.deepStrictEqual(recipients.sort(), ['contact@firm.com', 'info@goldenfirmiana.com.au', 'client@example.com'].sort());
    assert.strictEqual(summary.notifications.length, 2);
    assert.strictEqual(summary.clientConfirmation.status, 'fulfilled');
  } finally {
    process.env.NOTIFICATION_EMAILS = originalEnv.NOTIFICATION_EMAILS;
    process.env.ADMIN_EMAIL = originalEnv.ADMIN_EMAIL;
  }
});

test('respects NOTIFICATION_EMAILS override', async () => {
  const transporter = createMockTransporter();

  const originalEnv = {
    NOTIFICATION_EMAILS: process.env.NOTIFICATION_EMAILS
  };

  try {
    process.env.NOTIFICATION_EMAILS = 'notify1@example.com, notify2@example.com';

    const summary = await sendAppointmentNotification(baseAppointment, {
      transporter,
      silent: true
    });

    const notifications = summary.notifications.map((entry) => entry.to).sort();

    assert.deepStrictEqual(notifications, ['contact@firm.com', 'notify1@example.com', 'notify2@example.com'].sort());
    assert.strictEqual(summary.clientConfirmation.to, 'client@example.com');
  } finally {
    process.env.NOTIFICATION_EMAILS = originalEnv.NOTIFICATION_EMAILS;
  }
});

test('handles missing transporter configuration gracefully', async () => {
  const originalEnv = {
    EMAIL_SERVICE: process.env.EMAIL_SERVICE,
    EMAIL_HOST: process.env.EMAIL_HOST
  };

  try {
    delete process.env.EMAIL_SERVICE;
    delete process.env.EMAIL_HOST;

    const summary = await sendAppointmentNotification(baseAppointment, {
      transporter: null,
      silent: true
    });

    assert.deepStrictEqual(summary.notifications, []);
    assert.strictEqual(summary.clientConfirmation, null);
  } finally {
    process.env.EMAIL_SERVICE = originalEnv.EMAIL_SERVICE;
    process.env.EMAIL_HOST = originalEnv.EMAIL_HOST;
  }
});

