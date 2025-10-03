const nodemailer = require('nodemailer');

// 创建邮件传输器
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// 发送预约通知邮件
async function sendAppointmentNotification(appointmentData) {
  const transporter = createTransporter();
  
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

  // 格式化预约时间
  const formattedTime = new Date(appointmentTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 邮件内容
  const mailContent = `
    <h2>新预约通知</h2>
    <h3>客户信息</h3>
    <ul>
      <li>姓名：${clientName}</li>
      <li>电话：${clientPhone}</li>
      <li>邮箱：${clientEmail || '未提供'}</li>
    </ul>
    
    <h3>预约详情</h3>
    <ul>
      <li>律所：${firmName}</li>
      <li>服务：${serviceName}</li>
      <li>预约时间：${formattedTime}</li>
      <li>备注：${remark || '无'}</li>
    </ul>
    
    <p>请及时联系客户确认预约。</p>
  `;

  // 准备邮件选项
  const mailOptions = {
    from: process.env.EMAIL_USER,
    subject: `新预约通知 - ${clientName} - ${serviceName}`,
    html: mailContent
  };

  // 发送给律所
  if (firmEmail) {
    try {
      await transporter.sendMail({
        ...mailOptions,
        to: firmEmail
      });
      console.log('预约通知已发送至律所');
    } catch (error) {
      console.error('发送邮件至律所失败:', error);
    }
  }

  // 发送给管理员
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      await transporter.sendMail({
        ...mailOptions,
        to: adminEmail
      });
      console.log('预约通知已发送至管理员');
    } catch (error) {
      console.error('发送邮件至管理员失败:', error);
    }
  }

  // 发送确认邮件给客户
  if (clientEmail) {
    const clientMailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `预约确认 - ${firmName} - ${serviceName}`,
      html: `
        <h2>预约确认</h2>
        <p>尊敬的${clientName}，您的预约已成功提交。</p>
        
        <h3>预约详情</h3>
        <ul>
          <li>律所：${firmName}</li>
          <li>服务：${serviceName}</li>
          <li>预约时间：${formattedTime}</li>
        </ul>
        
        <p>律所将会尽快与您联系确认预约。如有任何问题，请联系律所。</p>
        <p>谢谢！</p>
      `
    };

    try {
      await transporter.sendMail(clientMailOptions);
      console.log('确认邮件已发送至客户');
    } catch (error) {
      console.error('发送确认邮件至客户失败:', error);
    }
  }
}

module.exports = {
  sendAppointmentNotification
};