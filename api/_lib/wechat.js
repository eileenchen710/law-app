const axios = require('axios');

const WECHAT_API_URL = 'https://api.weixin.qq.com/sns/jscode2session';

const getConfig = () => {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('WECHAT_APP_ID or WECHAT_APP_SECRET is not configured');
  }

  return { appId, appSecret };
};

const exchangeCodeForSession = async (code) => {
  if (!code) {
    throw new Error('Missing WeChat login code');
  }

  const { appId, appSecret } = getConfig();

  const params = {
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code'
  };

  const response = await axios.get(WECHAT_API_URL, { params });
  if (!response?.data) {
    throw new Error('Invalid response from WeChat');
  }

  const data = response.data;
  if (data.errcode) {
    const message = data.errmsg || 'Unknown WeChat auth error';
    throw new Error(`WeChat auth failed: ${data.errcode} ${message}`);
  }

  return {
    openId: data.openid,
    unionId: data.unionid,
    sessionKey: data.session_key
  };
};

module.exports = {
  exchangeCodeForSession
};
