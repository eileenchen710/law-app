const mongoose = require('mongoose');
require('dotenv').config();

const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

const checkFirmAvailableTimes = async () => {
  try {
    await connectToDatabase();

    const Firm = require('../api/models/firm');

    console.log('\n=== Checking Firm Available Times ===\n');

    const firms = await Firm.find().lean();

    if (firms.length === 0) {
      console.log('No firms found in database');
      return;
    }

    firms.forEach((firm, index) => {
      console.log(`${index + 1}. ${firm.name} (ID: ${firm._id})`);
      console.log(`   available_times field:`, firm.available_times);
      console.log(`   Type:`, typeof firm.available_times);
      console.log(`   Is Array:`, Array.isArray(firm.available_times));

      if (Array.isArray(firm.available_times)) {
        console.log(`   Length:`, firm.available_times.length);
        if (firm.available_times.length > 0) {
          console.log(`   Sample times:`, firm.available_times.slice(0, 3).map(t => {
            if (t instanceof Date) {
              return `Date: ${t.toISOString()}`;
            }
            return `${typeof t}: ${t}`;
          }));
        } else {
          console.log(`   ⚠️  Array is empty`);
        }
      } else if (firm.available_times === null) {
        console.log(`   ⚠️  Field is null`);
      } else if (firm.available_times === undefined) {
        console.log(`   ⚠️  Field is undefined (not set)`);
      }
      console.log('');
    });

    // Summary
    const withTimes = firms.filter(f =>
      Array.isArray(f.available_times) && f.available_times.length > 0
    );
    const withoutTimes = firms.filter(f =>
      !Array.isArray(f.available_times) || f.available_times.length === 0
    );

    console.log('=== Summary ===');
    console.log(`Total firms: ${firms.length}`);
    console.log(`Firms with available times: ${withTimes.length}`);
    console.log(`Firms without available times: ${withoutTimes.length}`);

    if (withoutTimes.length > 0) {
      console.log('\n⚠️  The following firms need available_times to be configured:');
      withoutTimes.forEach(f => console.log(`   - ${f.name}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

checkFirmAvailableTimes();
