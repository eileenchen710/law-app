const { connectDB } = require('../../_lib/db-optimized');
const { ObjectId } = require('mongodb');

/**
 * GET /api/admin/firms - 获取所有律所（管理端）
 */
async function listFirms(req, res) {
  try {
    const { db } = await connectDB();

    const firms = await db.collection('firms')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // 确保 _id 转换为字符串
    const firmsWithStringIds = firms.map(firm => ({
      ...firm,
      _id: firm._id.toString()
    }));

    console.log('Listing firms, sample ID:', firmsWithStringIds[0]?._id);

    res.status(200).json({
      success: true,
      data: firmsWithStringIds,
    });
  } catch (error) {
    console.error('Error listing firms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch firms',
    });
  }
}

/**
 * POST /api/admin/firms - 创建律所
 */
async function createFirm(req, res) {
  try {
    const { db } = await connectDB();
    const firmData = req.body;

    console.log('Creating firm with data:', firmData);

    // 验证必填字段
    if (!firmData.name || !firmData.description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description',
      });
    }

    const newFirm = {
      name: firmData.name,
      description: firmData.description,
      price: firmData.price || '面议',
      services: firmData.services || [],
      recommended: firmData.recommended || false,
      contact_phone: firmData.contact_phone,
      contact_email: firmData.contact_email,
      address: firmData.address,
      city: firmData.city,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('firms').insertOne(newFirm);

    const createdFirm = { ...newFirm, _id: result.insertedId };
    console.log('Firm created successfully:', createdFirm);

    res.status(201).json({
      success: true,
      data: createdFirm,
    });
  } catch (error) {
    console.error('Error creating firm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create firm',
      message: error.message,
    });
  }
}

/**
 * PUT /api/admin/firms/:id - 更新律所
 */
async function updateFirm(req, res) {
  try {
    console.log('Update firm - received ID:', req.query.id);
    console.log('Update firm - request body:', req.body);

    const { db } = await connectDB();
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Firm ID is required',
      });
    }

    if (!ObjectId.isValid(id)) {
      console.log('ObjectId.isValid returned false for update:', id);
      return res.status(400).json({
        success: false,
        error: 'Invalid firm ID',
        receivedId: id,
      });
    }

    delete updateData._id;
    updateData.updatedAt = new Date();

    console.log('Attempting to update firm with ObjectId:', id);

    // 先查找文档是否存在
    const existingFirm = await db.collection('firms').findOne({
      _id: new ObjectId(id)
    });

    console.log('Existing firm:', existingFirm);

    if (!existingFirm) {
      return res.status(404).json({
        success: false,
        error: 'Firm not found',
        searchedId: id,
      });
    }

    // 执行更新
    const result = await db.collection('firms').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Firm not found during update',
      });
    }

    // 获取更新后的文档
    const updatedFirm = await db.collection('firms').findOne({
      _id: new ObjectId(id)
    });

    if (!updatedFirm) {
      return res.status(404).json({
        success: false,
        error: 'Could not retrieve updated firm',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedFirm,
    });
  } catch (error) {
    console.error('Error updating firm:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to update firm',
      message: error.message,
    });
  }
}

/**
 * DELETE /api/admin/firms/:id - 删除律所
 */
async function deleteFirm(req, res) {
  try {
    const { db } = await connectDB();
    const { id } = req.query;

    console.log('Delete firm - received ID:', id, 'type:', typeof id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Firm ID is required',
      });
    }

    if (!ObjectId.isValid(id)) {
      console.log('ObjectId.isValid returned false for:', id);
      return res.status(400).json({
        success: false,
        error: 'Invalid firm ID',
        receivedId: id,
      });
    }

    const result = await db.collection('firms').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Firm not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Firm deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting firm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete firm',
    });
  }
}

/**
 * GET /api/admin/firms/:id/services - 获取律所的所有服务
 */
async function getFirmServices(req, res) {
  try {
    const { db } = await connectDB();
    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid firm ID',
      });
    }

    const firmObjectId = new ObjectId(id);

    // 查找包含此律所ID的所有服务
    const services = await db.collection('services')
      .find({
        $or: [
          { firm_ids: firmObjectId },
          { firm_id: firmObjectId }
        ]
      })
      .toArray();

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('Error fetching firm services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
    });
  }
}

/**
 * POST /api/admin/firms/:id/services - 为律所添加服务
 */
async function addServiceToFirm(req, res) {
  try {
    const { db } = await connectDB();
    const { id } = req.query;
    const { serviceId } = req.body;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid firm ID or service ID',
      });
    }

    const firmObjectId = new ObjectId(id);
    const serviceObjectId = new ObjectId(serviceId);

    // 将律所ID添加到服务的firm_ids数组
    const result = await db.collection('services').findOneAndUpdate(
      { _id: serviceObjectId },
      {
        $addToSet: { firm_ids: firmObjectId },
        $set: { updatedAt: new Date() }
      },
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
    console.error('Error adding service to firm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add service',
    });
  }
}

/**
 * DELETE /api/admin/firms/:id/services/:serviceId - 从律所移除服务
 */
async function removeServiceFromFirm(req, res) {
  try {
    const { db } = await connectDB();
    const { id, serviceId } = req.query;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid firm ID or service ID',
      });
    }

    const firmObjectId = new ObjectId(id);
    const serviceObjectId = new ObjectId(serviceId);

    // 从服务的firm_ids数组移除律所ID
    const result = await db.collection('services').findOneAndUpdate(
      { _id: serviceObjectId },
      {
        $pull: { firm_ids: firmObjectId },
        $set: { updatedAt: new Date() }
      },
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
    console.error('Error removing service from firm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove service',
    });
  }
}

module.exports = {
  listFirms,
  createFirm,
  updateFirm,
  deleteFirm,
  getFirmServices,
  addServiceToFirm,
  removeServiceFromFirm,
};
