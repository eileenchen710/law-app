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

const findConsultation = async (id) => {
  try {
    await connectToDatabase();

    const Consultation = require('../api/models/consultation');
    const Service = require('../api/models/service');
    const Firm = require('../api/models/firm');

    console.log('\n=== Looking for consultation ===');
    console.log('ID:', id);

    const consultation = await Consultation.findById(id).lean();

    if (!consultation) {
      console.log('Consultation not found!');
      return;
    }

    console.log('\n=== Consultation Record ===');
    console.log('ID:', consultation._id.toString());
    console.log('Name:', consultation.name);
    console.log('Email:', consultation.email);
    console.log('Phone:', consultation.phone);
    console.log('Service Name:', consultation.service_name);
    console.log('Firm ID:', consultation.firm_id?.toString() || 'NULL');
    console.log('Firm Name:', consultation.firm_name || 'NULL');
    console.log('Service ID:', consultation.service_id?.toString() || 'NULL');
    console.log('Status:', consultation.status);
    console.log('Created At:', consultation.createdAt);

    // If there's a service_id, lookup the service
    if (consultation.service_id) {
      console.log('\n=== Looking up Service ===');
      const service = await Service.findById(consultation.service_id).lean();
      if (service) {
        console.log('Service Title:', service.title);
        console.log('Service law_firm_id:', service.law_firm_id?.toString() || 'NULL');
        console.log('Service firm_id:', service.firm_id?.toString() || 'NULL');

        const serviceFirmId = service.law_firm_id || service.firm_id;
        if (serviceFirmId) {
          console.log('\n=== Looking up Firm from Service ===');
          const firm = await Firm.findById(serviceFirmId).lean();
          if (firm) {
            console.log('Firm Name:', firm.name);
            console.log('Firm ID:', firm._id.toString());
          } else {
            console.log('Firm not found with ID:', serviceFirmId.toString());
          }
        }
      } else {
        console.log('Service not found!');
      }
    }

    // If there's a firm_id, lookup the firm
    if (consultation.firm_id) {
      console.log('\n=== Looking up Firm directly ===');
      const firm = await Firm.findById(consultation.firm_id).lean();
      if (firm) {
        console.log('Firm Name:', firm.name);
        console.log('Firm ID:', firm._id.toString());
      } else {
        console.log('Firm not found with ID:', consultation.firm_id.toString());
      }
    }

    console.log('\n=== Summary ===');
    if (!consultation.firm_name && !consultation.service_id && !consultation.firm_id) {
      console.log('⚠️  This consultation is missing firm_name, service_id, AND firm_id');
      console.log('This is likely OLD data created before these fields were added.');
    } else if (!consultation.firm_name && consultation.service_id) {
      console.log('⚠️  This consultation has service_id but no firm_name');
      console.log('The lookup logic should handle this case.');
    } else if (!consultation.firm_name && consultation.firm_id) {
      console.log('⚠️  This consultation has firm_id but no firm_name');
      console.log('The lookup logic should handle this case.');
    } else if (consultation.firm_name) {
      console.log('✓ This consultation has firm_name:', consultation.firm_name);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

// Get ID from command line argument
const id = process.argv[2] || '68e9f50f458f4ee4fbeab671';

findConsultation(id);
