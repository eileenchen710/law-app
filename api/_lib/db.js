const mongoose = require("mongoose");

const { MONGODB_URI, MONGODB_DB } = process.env;

if (!MONGODB_URI) {
  throw new Error("The MONGODB_URI environment variable is not set.");
}

let cached = global._mongoose;

if (!cached) {
  // Share the connection promise across hot reloads/serverless invocations.
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  // Check if we have a cached connection that's ready
  if (cached.conn) {
    // For mongoose instance, check if connection is ready
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
      console.log('Using existing database connection');
      return cached.conn;
    }
    console.log('Cached connection not ready, state:', readyState);
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      dbName: MONGODB_DB,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
      heartbeatFrequencyMS: 5000,
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      retryWrites: true,
      w: 'majority'
    };

    console.log('Creating new database connection...');
    cached.promise = mongoose.connect(MONGODB_URI, options).then((mongooseInstance) => {
      console.log('Database connected successfully');
      
      // Schedule index creation asynchronously (don't block the connection)
      if (!global._indexesEnsured) {
        global._indexesEnsured = true;
        setImmediate(() => {
          const ensureIndexes = require('./ensure-indexes');
          ensureIndexes().catch(err => {
            console.error('Failed to create indexes:', err);
          });
        });
      }
      
      return mongooseInstance;
    }).catch(err => {
      console.error('Database connection failed:', err);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

module.exports = connectToDatabase;
module.exports.default = connectToDatabase;
