const { connectDB } = require('../../_lib/db-optimized');
const { ObjectId } = require('mongodb');

const normalizeAvailableTimes = (input) => {
  if (input === undefined) {
    return undefined;
  }

  if (input === null) {
    return [];
  }

  const values = Array.isArray(input) ? input : [input];
  const seen = new Set();
  const normalized = [];

  values.forEach((raw) => {
    if (!raw) {
      return;
    }

    let value = raw;

    if (value && typeof value === 'object' && '$date' in value) {
      value = value.$date;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const isoKey = date.toISOString();
    if (seen.has(isoKey)) {
      return;
    }

    seen.add(isoKey);
    normalized.push(date);
  });

  return normalized;
};



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
      practice_areas: firmData.practice_areas || [],
      tags: firmData.tags || [],
      lawyers: firmData.lawyers || [],
      rating: firmData.rating || 4.8,
      cases: firmData.cases || 0,
      recommended: firmData.recommended || false,
      contact_phone: firmData.contact_phone,
      contact_email: firmData.contact_email,
      phone: firmData.phone,
      email: firmData.email,
      website: firmData.website,
      address: firmData.address,
      city: firmData.city,
      slug: firmData.slug,
      available_times: normalizeAvailableTimes(firmData.available_times) || [],
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
 * 如果修改了 name，同步更新关联服务的 firm_name
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

    const normalizedTimes = normalizeAvailableTimes(updateData.available_times);
    if (normalizedTimes !== undefined) {
      updateData.available_times = normalizedTimes;
    } else {
      delete updateData.available_times;
    }

    delete updateData._id;
    updateData.updatedAt = new Date();

    console.log('Attempting to update firm with ID:', id);

    // 尝试两种 ID 格式查找文档
    let existingFirm = await db.collection('firms').findOne({
      _id: new ObjectId(id)
    });

    // 如果 ObjectId 格式找不到，尝试字符串格式
    if (!existingFirm) {
      existingFirm = await db.collection('firms').findOne({
        _id: id
      });
    }

    console.log('Existing firm:', existingFirm);

    if (!existingFirm) {
      return res.status(404).json({
        success: false,
        error: 'Firm not found',
        searchedId: id,
      });
    }

    // 使用找到的文档的实际 _id 进行更新
    const actualId = existingFirm._id;

    // 如果修改了律所名称，需要同步更新关联的服务
    const nameChanged = updateData.name && updateData.name !== existingFirm.name;

    const result = await db.collection('firms').updateOne(
      { _id: actualId },
      { $set: updateData }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Firm not found during update',
      });
    }

    // 如果律所名称改变了，更新所有关联服务的 firm_name 字段（如果存在）
    if (nameChanged) {
      await db.collection('services').updateMany(
        { law_firm_id: actualId },
        { $set: { firm_name: updateData.name } }
      );
      // 向后兼容 firm_id 字段
      await db.collection('services').updateMany(
        { firm_id: actualId },
        { $set: { firm_name: updateData.name } }
      );
    }

    // 获取更新后的文档
    const updatedFirm = await db.collection('firms').findOne({
      _id: actualId
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
 * 同时删除或更新关联的服务
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

    const firmId = new ObjectId(id);

    // 1. 检查有多少服务关联到这个律所
    const relatedServicesCount = await db.collection('services').countDocuments({
      $or: [
        { law_firm_id: firmId },
        { firm_id: firmId },
        { firm_ids: firmId }
      ]
    });

    console.log(`Found ${relatedServicesCount} services related to firm ${id}`);

    // 2. 删除律所
    const result = await db.collection('firms').deleteOne({
      _id: firmId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Firm not found',
      });
    }

    // 3. 处理关联的服务
    // 选项A: 删除所有关联的服务（如果服务只属于这个律所）
    await db.collection('services').deleteMany({
      $and: [
        { law_firm_id: firmId },
        { $or: [
          { firm_ids: { $exists: false } },
          { firm_ids: { $size: 0 } },
          { firm_ids: [firmId] }
        ]}
      ]
    });

    // 选项B: 从 firm_ids 数组中移除该律所（如果服务属于多个律所）
    await db.collection('services').updateMany(
      { firm_ids: firmId },
      { $pull: { firm_ids: firmId } }
    );

    // 选项C: 清除单一关联字段
    await db.collection('services').updateMany(
      { firm_id: firmId },
      { $unset: { firm_id: "" } }
    );

    console.log(`Cleaned up ${relatedServicesCount} service records`);

    res.status(200).json({
      success: true,
      message: 'Firm deleted successfully',
      relatedServicesAffected: relatedServicesCount
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
