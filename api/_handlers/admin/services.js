const { connectDB } = require('../../_lib/db-optimized');
const { ObjectId } = require('mongodb');



/**
 * GET /api/admin/services - 获取所有服务（管理端）
 */
async function listServices(req, res) {
  try {
    const { db } = await connectDB();

    const services = await db.collection('services')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('Error listing services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
    });
  }
}

/**
 * POST /api/admin/services - 创建服务
 */
async function createService(req, res) {
  try {
    const { db } = await connectDB();
    const serviceData = req.body;

    console.log('Creating service with data:', serviceData);

    // 验证必填字段
    if (!serviceData.title || !serviceData.description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description',
      });
    }

    // 处理 firm_ids
    let firmIds = [];
    if (serviceData.firm_ids && Array.isArray(serviceData.firm_ids)) {
      firmIds = serviceData.firm_ids
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));
    } else if (serviceData.firm_id && ObjectId.isValid(serviceData.firm_id)) {
      // 向后兼容单个 firm_id
      firmIds = [new ObjectId(serviceData.firm_id)];
    }

    const newService = {
      title: serviceData.title,
      description: serviceData.description,
      category: serviceData.category || '其他',
      price: serviceData.price || '面议',
      duration: serviceData.duration || '1-2小时',
      lawyer_name: serviceData.lawyer_name,
      lawyer_title: serviceData.lawyer_title,
      firm_ids: firmIds,
      firm_id: serviceData.firm_id,
      law_firm_id: serviceData.law_firm_id,
      status: serviceData.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('services').insertOne(newService);

    const createdService = { ...newService, _id: result.insertedId };
    console.log('Service created successfully:', createdService);

    res.status(201).json({
      success: true,
      data: createdService,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service',
      message: error.message,
    });
  }
}

/**
 * PUT /api/admin/services/:id - 更新服务
 */
async function updateService(req, res) {
  try {
    console.log('Update service - received ID:', req.query.id);
    console.log('Update service - request body:', req.body);

    const { db } = await connectDB();
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Service ID is required',
      });
    }

    if (!ObjectId.isValid(id)) {
      console.log('ObjectId.isValid returned false for:', id);
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
        receivedId: id,
      });
    }

    // 尝试两种 ID 格式查找文档
    let existingService = await db.collection('services').findOne({
      _id: new ObjectId(id)
    });

    // 如果 ObjectId 格式找不到，尝试字符串格式
    if (!existingService) {
      existingService = await db.collection('services').findOne({
        _id: id
      });
    }

    console.log('Existing service:', existingService);

    if (!existingService) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        searchedId: id,
      });
    }

    // 处理 firm_ids
    if (updateData.firm_ids && Array.isArray(updateData.firm_ids)) {
      updateData.firm_ids = updateData.firm_ids
        .filter(firmId => ObjectId.isValid(firmId))
        .map(firmId => new ObjectId(firmId));
    }

    delete updateData._id;
    updateData.updatedAt = new Date();

    // 使用找到的文档的实际 _id 进行更新
    const actualId = existingService._id;
    const result = await db.collection('services').updateOne(
      { _id: actualId },
      { $set: updateData }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found during update',
      });
    }

    // 获取更新后的文档
    const updatedService = await db.collection('services').findOne({
      _id: actualId
    });

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        error: 'Could not retrieve updated service',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedService,
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
    });
  }
}

/**
 * GET /api/admin/services/:id - 获取单个服务详情
 */
async function getService(req, res) {
  try {
    const { db } = await connectDB();
    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
      });
    }

    const service = await db.collection('services').findOne({
      _id: new ObjectId(id),
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service',
    });
  }
}

/**
 * DELETE /api/admin/services/:id - 删除服务
 * 同时从关联的律所 services 数组中移除服务标题
 */
async function deleteService(req, res) {
  try {
    const { db } = await connectDB();
    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
      });
    }

    const serviceId = new ObjectId(id);

    // 1. 先获取服务信息，看它关联了哪些律所
    const service = await db.collection('services').findOne({ _id: serviceId });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // 2. 删除服务
    const result = await db.collection('services').deleteOne({ _id: serviceId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // 3. 从相关律所的 services 数组中移除该服务标题
    if (service.law_firm_id) {
      await db.collection('firms').updateOne(
        { _id: service.law_firm_id },
        { $pull: { services: service.title } }
      );
    }

    // 如果有 firm_id 字段（向后兼容）
    if (service.firm_id && service.firm_id !== service.law_firm_id) {
      await db.collection('firms').updateOne(
        { _id: service.firm_id },
        { $pull: { services: service.title } }
      );
    }

    // 如果有 firm_ids 数组（多对多关系）
    if (service.firm_ids && Array.isArray(service.firm_ids)) {
      await db.collection('firms').updateMany(
        { _id: { $in: service.firm_ids } },
        { $pull: { services: service.title } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
    });
  }
}

module.exports = {
  listServices,
  createService,
  getService,
  updateService,
  deleteService,
};
