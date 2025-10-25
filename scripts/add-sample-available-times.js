const mongoose = require('mongoose');
const dayjs = require('dayjs');
require('dotenv').config();

const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

const addSampleAvailableTimes = async () => {
  try {
    await connectToDatabase();

    const Firm = require('../api/models/firm');

    console.log('\n=== Adding Sample Available Times to Firms ===\n');

    const firms = await Firm.find();

    if (firms.length === 0) {
      console.log('No firms found in database');
      return;
    }

    // Generate sample times for the next 7 days
    // Mon-Fri, 9:00, 10:00, 14:00, 15:00, 16:00
    const generateTimes = () => {
      const times = [];
      const now = dayjs();

      for (let day = 0; day < 14; day++) {
        const date = now.add(day, 'day');

        // Skip weekends
        if (date.day() === 0 || date.day() === 6) {
          continue;
        }

        // Add morning slots
        [9, 10].forEach(hour => {
          times.push(date.hour(hour).minute(0).second(0).toDate());
        });

        // Add afternoon slots
        [14, 15, 16].forEach(hour => {
          times.push(date.hour(hour).minute(0).second(0).toDate());
        });
      }

      return times;
    };

    const sampleTimes = generateTimes();
    console.log(`Generated ${sampleTimes.length} sample time slots`);
    console.log(`Time range: ${sampleTimes[0].toISOString()} to ${sampleTimes[sampleTimes.length - 1].toISOString()}\n`);

    for (const firm of firms) {
      console.log(`Updating: ${firm.name}`);

      firm.available_times = sampleTimes;
      firm.updatedAt = new Date();
      await firm.save();

      console.log(`✓ Added ${sampleTimes.length} time slots to ${firm.name}\n`);
    }

    console.log('=== Summary ===');
    console.log(`Updated ${firms.length} firms with available times`);
    console.log('Each firm now has time slots:');
    console.log('  - Monday to Friday');
    console.log('  - Morning: 9:00 AM, 10:00 AM');
    console.log('  - Afternoon: 2:00 PM, 3:00 PM, 4:00 PM');
    console.log('  - For the next 2 weeks (excluding weekends)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

addSampleAvailableTimes();
