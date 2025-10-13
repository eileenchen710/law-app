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

    // Consultations collection indexes
    const consultationIndexes = [
      { user_id: 1 },
      { email: 1 },
      { phone: 1 },
      { status: 1 },
      { createdAt: -1 },
      { preferred_time: -1 }
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

    if (collectionNames.includes('consultations')) {
      await db.collection('consultations').createIndexes(consultationIndexes);
      console.log('Consultations indexes created');
    }

    console.log('All indexes ensured successfully');
  } catch (error) {
    console.error('Error ensuring indexes:', error);
    // Don't throw - indexes are optimization, not critical
  }
}

module.exports = ensureIndexes;