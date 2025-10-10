const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');

const { sendAppointmentNotification } = require('../api/_lib/mailer');

const resolveEnvFile = () => {
  if (process.env.ENV_FILE) {
    const explicit = path.resolve(process.env.ENV_FILE);
    if (fs.existsSync(explicit)) {
      return explicit;
    }
    console.warn(`[mailer-test] 指定的 ENV_FILE 未找到：${explicit}`);
  }

  const defaultFiles = ['.env.local', '.env.development', '.env'];
  for (const filename of defaultFiles) {
    const fullPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
};

const envFile = resolveEnvFile();
if (envFile) {
  dotenv.config({ path: envFile });
  console.log(`[mailer-test] 载入环境变量：${envFile}`);
} else {
  dotenv.config();
  console.log('[mailer-test] 使用默认环境变量');
}

const createTestPayload = () => ({
  clientName: process.env.TEST_CLIENT_NAME || '测试客户',
  clientPhone: process.env.TEST_CLIENT_PHONE || '13800138000',
  clientEmail: process.env.TEST_CLIENT_EMAIL || 'client@example.com',
  firmName: process.env.TEST_FIRM_NAME || '金桉律师事务所',
  firmEmail: process.env.TEST_FIRM_EMAIL || '',
  serviceName: process.env.TEST_SERVICE_NAME || '法律咨询',
  appointmentTime: process.env.TEST_APPOINTMENT_TIME || new Date().toISOString(),
  remark: process.env.TEST_REMARK || '这是一次邮件发送测试'
});

(async () => {
  try {
    const payload = createTestPayload();
    const summary = await sendAppointmentNotification(payload, {
      silent: false
    });

    console.log('[mailer-test] 发送结果：');
    console.dir(summary, { depth: 4 });
  } catch (error) {
    console.error('[mailer-test] 发送失败:', error);
    process.exitCode = 1;
  }
})();

