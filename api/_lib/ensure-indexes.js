const mongoose = require('mongoose');

async function ensureIndexes() {
  try {
    console.log('Ensuring database indexes...');
    
    // Firms collection indexes
    const firmIndexes = [
      { name: 1 },
      { city: 1 },
      { createdAt: -1 },
      { 'name': 'text', 'description': 'text' }
    ];
    
    // Services collection indexes  
    const serviceIndexes = [
      { firm_id: 1 },
      { category: 1 },
      { createdAt: -1 },
      { firm_id: 1, category: 1 },
      { 'title': 'text', 'description': 'text' }
    ];
    
    // Appointments collection indexes
    const appointmentIndexes = [
      { firm_id: 1 },
      { service_id: 1 },
      { appointment_time: -1 },
      { status: 1 },
      { firm_id: 1, appointment_time: -1 },
      { createdAt: -1 }
    ];
    
    // Create indexes if collections exist
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (collectionNames.includes('firms')) {
      await db.collection('firms').createIndexes(firmIndexes);
      console.log('Firms indexes created');
    }
    
    if (collectionNames.includes('services')) {
      await db.collection('services').createIndexes(serviceIndexes);
      console.log('Services indexes created');
    }
    
    if (collectionNames.includes('appointments')) {
      await db.collection('appointments').createIndexes(appointmentIndexes);
      console.log('Appointments indexes created');
    }
    
    console.log('All indexes ensured successfully');
  } catch (error) {
    console.error('Error ensuring indexes:', error);
    // Don't throw - indexes are optimization, not critical
  }
}

module.exports = ensureIndexes;