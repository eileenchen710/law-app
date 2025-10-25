const mongoose = require('mongoose');
require('dotenv').config();

const connectToDatabase = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

const fixMissingFirm = async () => {
  try {
    await connectToDatabase();

    const Firm = require('../api/models/firm');
    const Consultation = require('../api/models/consultation');

    const missingFirmId = '68dd0de11f8a0e63c6dc1080';

    console.log('\n=== Checking for missing firm ===');
    console.log('Firm ID:', missingFirmId);

    // Check if firm exists
    const existingFirm = await Firm.findById(missingFirmId);
    if (existingFirm) {
      console.log('✓ Firm already exists:', existingFirm.name);
      return;
    }

    console.log('✗ Firm does not exist');

    // Count consultations referencing this firm
    const consultationCount = await Consultation.countDocuments({
      firm_id: missingFirmId
    });
    console.log(`Found ${consultationCount} consultations referencing this firm`);

    // Create the missing firm
    console.log('\n=== Creating missing firm ===');

    const newFirm = await Firm.create({
      _id: new mongoose.Types.ObjectId(missingFirmId),
      name: '华夏律师事务所',
      slug: 'huaxia-law-firm',
      description: '专业法律服务机构',
      city: '北京',
      address: '北京市朝阳区',
      phone: '+86-10-1234-5678',
      email: 'contact@huaxia-law.com',
      services: ['法律咨询', '诉讼代理', '合同审查'],
      practice_areas: ['民商事诉讼', '公司法务', '知识产权'],
      rating: 4.8,
      cases: 100,
      recommended: true,
      contact_email: 'contact@huaxia-law.com',
      contact_phone: '+86-10-1234-5678'
    });

    console.log('✓ Firm created successfully:', newFirm.name);
    console.log('Firm ID:', newFirm._id.toString());

    // Update consultations with firm name
    console.log('\n=== Updating consultations ===');
    const updateResult = await Consultation.updateMany(
      { firm_id: missingFirmId, firm_name: null },
      { $set: { firm_name: newFirm.name } }
    );

    console.log(`Updated ${updateResult.modifiedCount} consultations with firm name`);

    console.log('\n=== Fix completed successfully ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

fixMissingFirm();
