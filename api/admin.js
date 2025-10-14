const firmHandlers = require('./_handlers/admin/firms');
const serviceHandlers = require('./_handlers/admin/services');

module.exports = async (req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname, query } = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = pathname.replace('/api/admin', '').split('/').filter(Boolean);

  try {
    // 律所管理路由
    if (pathParts[0] === 'firms') {
      if (!pathParts[1]) {
        // /api/admin/firms
        if (req.method === 'GET') return firmHandlers.listFirms(req, res);
        if (req.method === 'POST') return firmHandlers.createFirm(req, res);
      } else if (pathParts[2] === 'services') {
        // /api/admin/firms/:id/services
        req.query = { id: pathParts[1], ...query };
        if (!pathParts[3]) {
          // /api/admin/firms/:id/services
          if (req.method === 'GET') return firmHandlers.getFirmServices(req, res);
          if (req.method === 'POST') return firmHandlers.addServiceToFirm(req, res);
        } else {
          // /api/admin/firms/:id/services/:serviceId
          req.query = { id: pathParts[1], serviceId: pathParts[3], ...query };
          if (req.method === 'DELETE') return firmHandlers.removeServiceFromFirm(req, res);
        }
      } else {
        // /api/admin/firms/:id
        req.query = { id: pathParts[1], ...query };
        if (req.method === 'GET') return firmHandlers.getFirmServices(req, res);
        if (req.method === 'PUT') return firmHandlers.updateFirm(req, res);
        if (req.method === 'DELETE') return firmHandlers.deleteFirm(req, res);
      }
    }

    // 服务管理路由
    if (pathParts[0] === 'services') {
      if (!pathParts[1]) {
        // /api/admin/services
        if (req.method === 'GET') return serviceHandlers.listServices(req, res);
        if (req.method === 'POST') return serviceHandlers.createService(req, res);
      } else {
        // /api/admin/services/:id
        req.query = { id: pathParts[1], ...query };
        if (req.method === 'GET') return serviceHandlers.getService(req, res);
        if (req.method === 'PUT') return serviceHandlers.updateService(req, res);
        if (req.method === 'DELETE') return serviceHandlers.deleteService(req, res);
      }
    }

    // 未找到路由
    res.status(404).json({
      success: false,
      error: 'Admin API endpoint not found',
    });
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
