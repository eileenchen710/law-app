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

const checkFirms = async () => {
  try {
    await connectToDatabase();

    const Firm = require('../api/models/firm');
    const Consultation = require('../api/models/consultation');

    console.log('\n=== All Firms in Database ===\n');

    const firms = await Firm.find().lean();

    if (firms.length === 0) {
      console.log('⚠️  No firms found in database!');
    } else {
      console.log(`Found ${firms.length} firms:\n`);
      firms.forEach((firm, index) => {
        console.log(`${index + 1}. ${firm.name}`);
        console.log(`   ID: ${firm._id.toString()}`);
        console.log(`   City: ${firm.city || 'N/A'}`);
        console.log(`   Recommended: ${firm.recommended ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Check for consultations with missing firm references
    console.log('\n=== Consultations with Missing Firm References ===\n');

    const consultations = await Consultation.find({ firm_id: { $ne: null } })
      .select('firm_id firm_name')
      .lean();

    const firmIds = new Set(firms.map(f => f._id.toString()));
    const orphanedConsultations = consultations.filter(c =>
      c.firm_id && !firmIds.has(c.firm_id.toString())
    );

    if (orphanedConsultations.length > 0) {
      console.log(`⚠️  Found ${orphanedConsultations.length} consultations referencing non-existent firms:\n`);

      const orphanedFirmIds = {};
      orphanedConsultations.forEach(c => {
        const firmId = c.firm_id.toString();
        if (!orphanedFirmIds[firmId]) {
          orphanedFirmIds[firmId] = 0;
        }
        orphanedFirmIds[firmId]++;
      });

      Object.entries(orphanedFirmIds).forEach(([firmId, count]) => {
        console.log(`   Firm ID: ${firmId}`);
        console.log(`   Referenced by ${count} consultations`);
        console.log('');
      });
    } else {
      console.log('✓ All consultations reference valid firms');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

checkFirms();
