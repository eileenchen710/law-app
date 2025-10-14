const connectToDatabase = require('../../_lib/db-optimized');
const { exchangeCodeForSession } = require('../../_lib/wechat');
const {
  createToken,
  sanitizeUser,
  resolveUserRole
} = require('../../_lib/auth');
const User = require('../../models/user');
const bcrypt = require('bcryptjs');

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const respond = (res, status, payload) => {
  res.status(status).json(payload);
};

const determineRole = (userPayload, requestBody) => {
  const requestedRole = requestBody?.role;
  return resolveUserRole({
    email: userPayload.email,
    wechatOpenId: userPayload.wechat?.openid,
    requestedRole
  });
};

const buildUserPayload = (user, token) => ({
  token,
  user: sanitizeUser(user)
});

const ensureDisplayName = (source) => {
  if (!source) return '';
  if (source.displayName) return source.displayName;
  if (source.nickName) return source.nickName;
  if (source.nickname) return source.nickname;
  if (source.name) return source.name;
  return '';
};

const handleWechatLogin = async (req, res) => {
  try {
    const { code, userInfo, ip } = req.body || {};
    if (!code) {
      return respond(res, 400, { error: 'Missing WeChat login code' });
    }

    console.log('[auth] Received WeChat login request:', {
      hasCode: !!code,
      hasUserInfo: !!userInfo,
      userInfoKeys: userInfo ? Object.keys(userInfo) : []
    });

    let session;
    try {
      session = await exchangeCodeForSession(code);
    } catch (error) {
      console.error('[auth] WeChat exchange failed:', error);
      return respond(res, 502, { error: 'WeChat authentication failed', details: error.message });
    }

  console.log('[auth] WeChat session:', {
    openId: session.openId,
    hasUnionId: !!session.unionId
  });

  await connectToDatabase();
  console.log('[auth] Connected to database');

  const existingUser = await User.findOne({ 'wechat.openid': session.openId });
  console.log('[auth] Existing user found:', !!existingUser, existingUser?._id);

  const baseProfile = {
    display_name: ensureDisplayName(userInfo),
    avatar_url: userInfo?.avatarUrl || userInfo?.avatar || '',
    email: userInfo?.email?.toLowerCase(),
    phone: userInfo?.phoneNumber,
    provider: 'wechat',
    wechat: {
      openid: session.openId,
      unionid: session.unionId,
      session_key: session.sessionKey
    },
    last_login_at: new Date(),
    last_login_ip: ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
  };

  if (existingUser) {
    console.log('[auth] Updating existing user');
    existingUser.display_name = baseProfile.display_name || existingUser.display_name;
    existingUser.avatar_url = baseProfile.avatar_url || existingUser.avatar_url;
    existingUser.email = baseProfile.email || existingUser.email;
    existingUser.phone = baseProfile.phone || existingUser.phone;
    existingUser.wechat.session_key = session.sessionKey;
    existingUser.last_login_at = baseProfile.last_login_at;
    existingUser.last_login_ip = baseProfile.last_login_ip;
    existingUser.provider = 'wechat';
    existingUser.role = determineRole(existingUser, req.body);

    console.log('[auth] Determined role for existing user:', existingUser.role);
    await existingUser.save();
    console.log('[auth] User updated successfully:', existingUser._id, 'role:', existingUser.role);
    const token = createToken(existingUser);
    console.log('[auth] Token created, payload includes role:', existingUser.role);
    return respond(res, 200, buildUserPayload(existingUser, token));
  }

  console.log('[auth] Creating new user with profile:', baseProfile);
  const role = determineRole({
    email: baseProfile.email,
    wechat: { openid: session.openId }
  }, req.body);

  console.log('[auth] Determined role for new user:', role);

  const newUser = await User.create({
    ...baseProfile,
    role,
    metadata: userInfo?.metadata || {}
  });

  console.log('[auth] New user created successfully:', newUser._id, 'role:', newUser.role);
  const token = createToken(newUser);
  console.log('[auth] Token created for new user, payload includes role:', newUser.role);
  return respond(res, 200, buildUserPayload(newUser, token));
  } catch (error) {
    console.error('[auth] WeChat login handler error:', error);
    return respond(res, 500, { error: 'Internal server error', details: error.message });
  }
};

const handleAnonymousLogin = async (req, res) => {
  const { email, phone, name, avatarUrl, role } = req.body || {};

  await connectToDatabase();

  const normalizedEmail = email?.trim()?.toLowerCase();
  const lookupCriteria = [];
  if (normalizedEmail) lookupCriteria.push({ email: normalizedEmail });
  if (phone) lookupCriteria.push({ phone: phone.trim() });

  let user = null;
  if (lookupCriteria.length) {
    user = await User.findOne({ $or: lookupCriteria });
  }

  const displayName = name?.trim() || ensureDisplayName(req.body) || '访客用户';

  if (!user) {
    const resolvedRole = resolveUserRole({ email: normalizedEmail, requestedRole: role });
    user = await User.create({
      display_name: displayName,
      email: normalizedEmail,
      phone: phone?.trim(),
      avatar_url: avatarUrl,
      provider: 'anonymous',
      role: resolvedRole,
      last_login_at: new Date(),
      metadata: {
        userAgent: req.headers['user-agent']
      }
    });
  } else {
    if (displayName) user.display_name = displayName;
    if (avatarUrl) user.avatar_url = avatarUrl;
    if (normalizedEmail) user.email = normalizedEmail;
    if (phone) user.phone = phone.trim();
    user.provider = user.provider || 'anonymous';
    user.role = resolveUserRole({ email: user.email, requestedRole: role });
    user.last_login_at = new Date();
    user.last_login_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await user.save();
  }

  const token = createToken(user);
  return respond(res, 200, buildUserPayload(user, token));
};

const handlePasswordLogin = async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return respond(res, 400, { error: 'Missing username or password' });
  }

  await connectToDatabase();

  const user = await User.findOne({ username: username.trim() }).select('+password_hash');

  if (!user || !user.password_hash) {
    return respond(res, 401, { error: 'Invalid username or password' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return respond(res, 401, { error: 'Invalid username or password' });
  }

  user.last_login_at = new Date();
  user.last_login_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  await user.save();

  console.log('[auth] Password login successful for user:', user._id, 'role:', user.role);
  const token = createToken(user);
  console.log('[auth] Token created for password login, payload includes role:', user.role);
  return respond(res, 200, buildUserPayload(user, token));
};

const handlePasswordRegister = async (req, res) => {
  const { username, password, email, phone } = req.body || {};

  if (!username || !password || !email) {
    return respond(res, 400, { error: 'Missing required fields: username, password, email' });
  }

  await connectToDatabase();

  const existingUser = await User.findOne({
    $or: [
      { username: username.trim() },
      { email: email.trim().toLowerCase() }
    ]
  });

  if (existingUser) {
    return respond(res, 409, { error: 'Username or email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    username: username.trim(),
    password_hash: passwordHash,
    display_name: username.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim(),
    provider: 'password',
    role: 'user',
    last_login_at: new Date(),
    last_login_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
  });

  const token = createToken(newUser);
  return respond(res, 200, buildUserPayload(newUser, token));
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.params?.action || req.query?.action || '').toLowerCase();

  if (req.method === 'POST' && action === 'wechat') {
    return handleWechatLogin(req, res);
  }

  if (req.method === 'POST' && (action === 'anonymous' || action === 'basic')) {
    return handleAnonymousLogin(req, res);
  }

  if (req.method === 'POST' && action === 'login') {
    return handlePasswordLogin(req, res);
  }

  if (req.method === 'POST' && action === 'register') {
    return handlePasswordRegister(req, res);
  }

  return respond(res, 404, { error: 'Auth route not found' });
};
