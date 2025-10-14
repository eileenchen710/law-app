const connectToDatabase = require('../../_lib/db-optimized');
const {
  authenticateRequest,
  sanitizeUser
} = require('../../_lib/auth');
const Consultation = require('../../models/consultation');
const User = require('../../models/user');

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const respond = (res, status, payload) => {
  res.status(status).json(payload);
};

const loadAppointmentsForUser = async (user) => {
  if (!user) return [];

  const criteria = [];
  if (user._id) {
    criteria.push({ user_id: user._id });
  }
  if (user.email) {
    criteria.push({ email: user.email });
  }
  if (user.phone) {
    criteria.push({ phone: user.phone });
  }

  if (!criteria.length) {
    return [];
  }

  const query = criteria.length === 1 ? criteria[0] : { $or: criteria };

  const consultations = await Consultation.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return consultations.map((consultation) => ({
    id: consultation._id.toString(),
    name: consultation.name,
    phone: consultation.phone,
    email: consultation.email,
    firm_id: null,
    firm_name: null,
    service_id: null,
    service_name: consultation.service_name || '在线咨询',
    time: consultation.preferred_time || consultation.createdAt,
    remark: consultation.message,
    status: consultation.status,
    created_at: consultation.createdAt
  }));
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authResult = await authenticateRequest(req, { requireAuth: true });
  if (authResult.error) {
    return respond(res, 401, { error: authResult.error });
  }

  const tokenUser = authResult.user;

  await connectToDatabase();

  const freshUser = await User.findById(tokenUser._id);
  if (!freshUser) {
    return respond(res, 404, { error: 'User not found' });
  }

  console.log('[users-me] Fresh user from DB:', {
    id: freshUser._id,
    email: freshUser.email,
    role: freshUser.role,
    display_name: freshUser.display_name
  });

  if (req.method === 'PUT') {
    const { displayName, avatarUrl, email, phone, metadata } = req.body || {};

    if (displayName !== undefined) {
      freshUser.display_name = displayName?.trim?.() || '';
    }
    if (avatarUrl !== undefined) {
      freshUser.avatar_url = avatarUrl?.trim?.() || '';
    }
    if (email !== undefined) {
      freshUser.email = email?.trim?.().toLowerCase() || undefined;
    }
    if (phone !== undefined) {
      freshUser.phone = phone?.trim?.() || undefined;
    }
    if (metadata && typeof metadata === 'object') {
      freshUser.metadata = {
        ...(freshUser.metadata || {}),
        ...metadata
      };
    }

    await freshUser.save();
  }

  const appointments = await loadAppointmentsForUser(freshUser);

  const sanitized = sanitizeUser(freshUser);
  console.log('[users-me] Sanitized user:', sanitized);

  return respond(res, 200, {
    user: sanitized,
    appointments
  });
};
