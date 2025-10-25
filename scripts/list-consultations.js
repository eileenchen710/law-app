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

const listConsultations = async () => {
  try {
    await connectToDatabase();

    const Consultation = require('../api/models/consultation');

    console.log('\n=== All Consultations ===\n');

    const consultations = await Consultation.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (consultations.length === 0) {
      console.log('No consultations found!');
      return;
    }

    console.log(`Found ${consultations.length} consultations (showing latest 20):\n`);

    consultations.forEach((c, index) => {
      console.log(`${index + 1}. ID: ${c._id.toString()}`);
      console.log(`   Name: ${c.name}`);
      console.log(`   Service: ${c.service_name || 'N/A'}`);
      console.log(`   Firm ID: ${c.firm_id?.toString() || 'NULL'}`);
      console.log(`   Firm Name: ${c.firm_name || 'NULL'}`);
      console.log(`   Service ID: ${c.service_id?.toString() || 'NULL'}`);
      console.log(`   Status: ${c.status}`);
      console.log(`   Created: ${c.createdAt}`);

      // Check for missing data
      const issues = [];
      if (!c.firm_name) issues.push('missing firm_name');
      if (!c.service_id) issues.push('missing service_id');
      if (!c.firm_id) issues.push('missing firm_id');

      if (issues.length > 0) {
        console.log(`   ⚠️  Issues: ${issues.join(', ')}`);
      }
      console.log('');
    });

    // Statistics
    const missingFirmName = consultations.filter(c => !c.firm_name).length;
    const missingServiceId = consultations.filter(c => !c.service_id).length;
    const missingFirmId = consultations.filter(c => !c.firm_id).length;

    console.log('\n=== Statistics ===');
    console.log(`Total consultations: ${consultations.length}`);
    console.log(`Missing firm_name: ${missingFirmName} (${Math.round(missingFirmName / consultations.length * 100)}%)`);
    console.log(`Missing service_id: ${missingServiceId} (${Math.round(missingServiceId / consultations.length * 100)}%)`);
    console.log(`Missing firm_id: ${missingFirmId} (${Math.round(missingFirmId / consultations.length * 100)}%)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

listConsultations();
