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

  // Debug: List all firms and test specific queries
  try {
    const allFirms = await Firm.find().select('_id name').lean();
    console.log('[users-me] All firms in database:', allFirms.map(f => ({ id: f._id.toString(), name: f.name })));

    // Test query with the specific ID
    const mongoose = require('mongoose');
    const testId = '68dd0de11f8a0e63c6dc1080';
    const testObjId = new mongoose.Types.ObjectId(testId);

    // Try multiple query approaches
    const test1 = await Firm.findById(testObjId).select('name').lean();
    console.log('[users-me] TEST findById with ObjectId:', test1 ? test1.name : 'NOT FOUND');

    const test2 = await Firm.findOne({ _id: testObjId }).select('name').lean();
    console.log('[users-me] TEST findOne with ObjectId:', test2 ? test2.name : 'NOT FOUND');

    const test3 = await Firm.find({ _id: { $in: [testObjId] } }).select('name').lean();
    console.log('[users-me] TEST find with $in [ObjectId]:', test3.length, test3.map(f => f.name));

    const test4 = await Firm.find({ _id: testObjId }).select('name').lean();
    console.log('[users-me] TEST find with _id: ObjectId:', test4.length, test4.map(f => f.name));

    // Compare ObjectId representations
    const firstFirm = allFirms[0];
    console.log('[users-me] First firm _id type:', typeof firstFirm._id, firstFirm._id.constructor.name);
    console.log('[users-me] First firm _id equals testObjId:', firstFirm._id.equals(testObjId));
    console.log('[users-me] First firm _id toString:', firstFirm._id.toString());
    console.log('[users-me] testObjId toString:', testObjId.toString());
  } catch (err) {
    console.log('[users-me] Error in debug:', err.message);
  }

  // Batch lookup firms
  const firmMap = new Map();
  if (firmIdsToLookup.length > 0) {
    const uniqueFirmIds = [...new Set(firmIdsToLookup)];

    console.log('[users-me] Looking up firms with string IDs:', uniqueFirmIds);

    // Convert string IDs to ObjectId for MongoDB query
    const mongoose = require('mongoose');
    const objectIds = uniqueFirmIds.map(id => {
      try {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
      } catch (e) {
        console.log('[users-me] Invalid ObjectId:', id);
        return id;
      }
    });

    console.log('[users-me] Converted to ObjectIds:', objectIds);

    const firms = await Firm.find({ _id: { $in: objectIds } })
      .select('name')
      .lean();
    console.log('[users-me] Firms found in batch query:', firms.length, firms.map(f => ({ id: f._id.toString(), name: f.name })));

    firms.forEach(f => firmMap.set(f._id.toString(), f.name));
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
