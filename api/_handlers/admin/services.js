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
      lawyer_name: serviceData.lawyer_name,
      firm_ids: firmIds,
      law_firm_id: serviceData.law_firm_id,
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
    const { db } = await connectDB();
    const { id } = req.query;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
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

    const result = await db.collection('services').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.value,
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
 * DELETE /api/admin/services/:id - 删除服务
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

    const result = await db.collection('services').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
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
  updateService,
  deleteService,
};
