/**
 * This script connects to the PRODUCTION database used by Vercel
 * Make sure to set the correct MONGODB_URI environment variable
 */
const mongoose = require('mongoose');

// Get MongoDB URI from command line or environment
const mongoUri = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('Error: No MongoDB URI provided');
  console.error('Usage: node check-production-firms.js "mongodb+srv://..."');
  console.error('   or: MONGODB_URI="..." node check-production-firms.js');
  process.exit(1);
}

const connectToDatabase = async () => {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  console.log('Database:', mongoose.connection.db.databaseName);
};

const checkFirms = async () => {
  try {
    await connectToDatabase();

    const Firm = require('../api/models/firm');
    const Consultation = require('../api/models/consultation');

    console.log('\n=== All Firms ===\n');

    const firms = await Firm.find().lean();
    console.log(`Found ${firms.length} firms:\n`);

    if (firms.length === 0) {
      console.log('⚠️  No firms in database!');
    } else {
      firms.forEach((firm, index) => {
        console.log(`${index + 1}. ${firm.name}`);
        console.log(`   ID: ${firm._id.toString()}`);
        console.log('');
      });
    }

    // Check the specific missing firm ID
    const missingFirmId = '68dd0de11f8a0e63c6dc1080';
    console.log('\n=== Checking Missing Firm ===');
    console.log('Looking for ID:', missingFirmId);

    const firm = await Firm.findById(missingFirmId);
    if (firm) {
      console.log('✓ Firm exists:', firm.name);
    } else {
      console.log('✗ Firm NOT found');

      // Count consultations referencing this ID
      const count = await Consultation.countDocuments({ firm_id: missingFirmId });
      console.log(`⚠️  ${count} consultations reference this non-existent firm`);

      if (count > 0) {
        console.log('\n=== Solution ===');
        console.log('You need to either:');
        console.log('1. Create a firm with this specific ID');
        console.log('2. Update all consultations to reference a valid firm ID');
        console.log('3. Update the application to handle missing firm_id gracefully');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

checkFirms();
