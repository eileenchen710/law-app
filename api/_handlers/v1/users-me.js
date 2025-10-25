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

  console.log('[users-me] Raw consultations from DB:', consultations.length);
  if (consultations.length > 0) {
    console.log('[users-me] Sample consultation:', {
      id: consultations[0]._id,
      firm_id: consultations[0].firm_id,
      firm_name: consultations[0].firm_name,
      service_id: consultations[0].service_id,
      service_name: consultations[0].service_name
    });
  }

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

  // Batch lookup firms
  const firmMap = new Map();
  console.log('[users-me] Firm IDs to lookup:', firmIdsToLookup);
  if (firmIdsToLookup.length > 0) {
    const uniqueFirmIds = [...new Set(firmIdsToLookup)];
    console.log('[users-me] Unique firm IDs:', uniqueFirmIds);
    const firms = await Firm.find({ _id: { $in: uniqueFirmIds } })
      .select('name')
      .lean();
    console.log('[users-me] Firms found:', firms.length, firms.map(f => ({ id: f._id.toString(), name: f.name })));
    firms.forEach(f => firmMap.set(f._id.toString(), f.name));
    console.log('[users-me] Firm map entries:', Array.from(firmMap.entries()));
  }

  const results = consultations.map((consultation) => {
    const consultationFirmId = consultation.firm_id?.toString();
    const serviceFirmId = consultation.service_id ? serviceMap.get(consultation.service_id.toString()) : null;
    const effectiveFirmId = consultationFirmId || serviceFirmId;

    const result = {
      id: consultation._id.toString(),
      user_id: consultation.user_id?.toString() || null,
      name: consultation.name,
      phone: consultation.phone,
      email: consultation.email,
      firm_id: effectiveFirmId || null,
      firm_name: consultation.firm_name ||
        (effectiveFirmId ? firmMap.get(effectiveFirmId) : null) ||
        null,
      service_id: consultation.service_id?.toString() || null,
      service_name: consultation.service_name || '在线咨询',
      time: consultation.preferred_time || consultation.createdAt,
      remark: consultation.message,
      status: consultation.status,
      created_at: consultation.createdAt
    };

    if (!result.firm_name) {
      console.log('[users-me] Missing firm_name for consultation:', {
        id: result.id,
        consultation_firm_id: consultationFirmId,
        consultation_firm_name: consultation.firm_name,
        service_id: consultation.service_id?.toString(),
        service_firm_id: serviceFirmId,
        effective_firm_id: effectiveFirmId,
        firm_map_keys: Array.from(firmMap.keys()),
        lookup_result: effectiveFirmId ? firmMap.get(effectiveFirmId) : 'no effective firm id'
      });
    }

    return result;
  });

  console.log('[users-me] Returning appointments:', results.length, 'items');
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
