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

  // Removed verbose logging - keeping it clean

  // Get unique service IDs to lookup firm info from services
  const Service = require('../../models/service');
  const Firm = require('../../models/firm');

  const serviceIdsToLookup = consultations
    .filter(c => c.service_id && !c.firm_id)
    .map(c => c.service_id);

  const serviceMap = new Map();
  if (serviceIdsToLookup.length > 0) {
    const services = await Service.find({ _id: { $in: serviceIdsToLookup } })
      .select('law_firm_id firm_id')
      .lean();
    services.forEach(s => {
      const firmId = s.law_firm_id || s.firm_id;
      if (firmId) {
        serviceMap.set(s._id.toString(), firmId.toString());
      }
    });
  }

  // Get unique firm IDs that need to be looked up
  const firmIdsToLookup = [
    ...consultations
      .filter(c => c.firm_id && !c.firm_name)
      .map(c => c.firm_id.toString()),
    ...Array.from(serviceMap.values())
  ];

  // Removed debug code - issue identified: firms collection uses string _id instead of ObjectId

  // Batch lookup firms
  // Note: MongoDB $in query with string IDs doesn't work reliably in this environment
  // Using manual filtering as the primary approach
  const firmMap = new Map();
  if (firmIdsToLookup.length > 0) {
    const uniqueFirmIds = [...new Set(firmIdsToLookup)];

    // Get all firms and filter manually
    const allFirms = await Firm.find().lean();
    const matchingFirms = allFirms.filter(firm =>
      uniqueFirmIds.includes(firm._id) ||
      uniqueFirmIds.includes(firm._id.toString())
    );

    matchingFirms.forEach(firm => {
      const idStr = typeof firm._id === 'string' ? firm._id : firm._id.toString();
      firmMap.set(idStr, firm.name);
    });
  }

  const results = consultations.map((consultation) => {
    const consultationFirmId = consultation.firm_id?.toString();
    const serviceFirmId = consultation.service_id ? serviceMap.get(consultation.service_id.toString()) : null;
    const effectiveFirmId = consultationFirmId || serviceFirmId;

    // Determine firm name with fallback for deleted/missing firms
    let firmName = consultation.firm_name;
    if (!firmName && effectiveFirmId) {
      firmName = firmMap.get(effectiveFirmId);
      // If firm_id exists but firm not found in database, use a fallback name
      if (!firmName) {
        firmName = '律所（已删除）';
        console.log('[users-me] Firm not found for ID:', effectiveFirmId, '- using fallback name');
      }
    }

    const result = {
      id: consultation._id.toString(),
      user_id: consultation.user_id?.toString() || null,
      name: consultation.name,
      phone: consultation.phone,
      email: consultation.email,
      firm_id: effectiveFirmId || null,
      firm_name: firmName || null,
      service_id: consultation.service_id?.toString() || null,
      service_name: consultation.service_name || '在线咨询',
      time: consultation.preferred_time || consultation.createdAt,
      remark: consultation.message,
      status: consultation.status,
      created_at: consultation.createdAt
    };

    // Simplified logging - only log if truly missing (no firm_id at all)
    if (!result.firm_name && !effectiveFirmId) {
      console.log('[users-me] Consultation with no firm reference:', result.id);
    }

    return result;
  });

  return results;
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
