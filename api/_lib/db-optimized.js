const mongoose = require('mongoose');

const { MONGODB_URI, MONGODB_DB } = process.env;

if (!MONGODB_URI) {
  throw new Error('The MONGODB_URI environment variable is not set.');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and between function calls in production.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  // If we have a cached connection, use it
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection promise exists, wait for it
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
    } catch (e) {
      cached.promise = null;
      throw e;
    }
    return cached.conn;
  }

  // Otherwise, create a new connection
  const opts = {
    bufferCommands: false,
    dbName: MONGODB_DB,
    // Optimize for serverless
    maxPoolSize: 1,  // Serverless functions typically handle one request at a time
    minPoolSize: 0,   // Don't maintain idle connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    w: 'majority'
  };

  cached.promise = mongoose.connect(MONGODB_URI, opts)
    .then((mongoose) => {
      console.log('MongoDB connected');
      return mongoose;
    })
    .catch((e) => {
      cached.promise = null;
      throw e;
    });

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Export both connectToDatabase (for v1.js) and connectDB (for admin handlers)
async function connectDB() {
  await connectToDatabase();
  return { db: mongoose.connection.db };
}

module.exports = connectToDatabase;
module.exports.connectDB = connectDB;