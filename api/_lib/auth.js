const jwt = require('jsonwebtoken');
const connectToDatabase = require('./db-optimized');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || null;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '14d';

if (!JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not configured. Authentication will fail.');
}

const parseAuthHeader = (headerValue) => {
  if (!headerValue) return null;
  if (headerValue.startsWith('Bearer ')) {
    return headerValue.slice('Bearer '.length).trim();
  }
  return headerValue.trim();
};

const createToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('JWT secret is not configured');
  }

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    provider: user.provider
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

const verifyToken = (token) => {
  if (!token || !JWT_SECRET) {
    throw new Error('Missing token or JWT secret');
  }
  return jwt.verify(token, JWT_SECRET);
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader) {
    return parseAuthHeader(authHeader);
  }

  const cookieToken = req.cookies?.token || req.cookies?.authorization;
  if (cookieToken) {
    return parseAuthHeader(cookieToken);
  }

  if (req.query?.token) {
    return req.query.token;
  }

  return null;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  return {
    id: user._id.toString(),
    displayName: user.display_name || '',
    avatarUrl: user.avatar_url || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'user',
    provider: user.provider || 'anonymous',
    metadata: user.metadata || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const getAdminWechatOpenIds = () =>
  (process.env.ADMIN_WECHAT_OPENIDS || '')
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const resolveUserRole = ({ email, wechatOpenId, requestedRole }) => {
  console.log('[auth] resolveUserRole called with:', { email, wechatOpenId, requestedRole });

  if (requestedRole === 'admin') {
    console.log('[auth] Granting admin role due to requestedRole');
    return 'admin';
  }
  const adminEmails = getAdminEmails();
  const adminWechatIds = getAdminWechatOpenIds();

  console.log('[auth] Admin emails from env:', adminEmails);
  console.log('[auth] Admin WeChat IDs from env:', adminWechatIds);

  if (email && adminEmails.includes(email.toLowerCase())) {
    console.log('[auth] Granting admin role due to email match');
    return 'admin';
  }
  if (wechatOpenId && adminWechatIds.includes(wechatOpenId)) {
    console.log('[auth] Granting admin role due to WeChat openid match');
    return 'admin';
  }
  console.log('[auth] Returning user role (no admin match)');
  return 'user';
};

const authenticateRequest = async (req, { requireAuth = true } = {}) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      if (requireAuth) {
        return { error: 'Missing token' };
      }
      return { user: null };
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (requireAuth) {
        return { error: 'Invalid token' };
      }
      return { user: null };
    }

    await connectToDatabase();
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      if (requireAuth) {
        return { error: 'User not found' };
      }
      return { user: null };
    }

    return { user, token };
  } catch (error) {
    console.error('[auth] authenticateRequest failed:', error);
    if (requireAuth) {
      return { error: 'Authentication failed' };
    }
    return { user: null };
  }
};

module.exports = {
  createToken,
  verifyToken,
  getTokenFromRequest,
  sanitizeUser,
  authenticateRequest,
  resolveUserRole
};
