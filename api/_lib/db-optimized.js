const { MongoClient } = require('mongodb');

const { MONGODB_URI, MONGODB_DB } = process.env;

if (!MONGODB_URI) {
  throw new Error('The MONGODB_URI environment variable is not set.');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and between function calls in production.
 */
let cached = global.mongoClient;

if (!cached) {
  cached = global.mongoClient = { client: null, db: null, promise: null };
}

async function connectDB() {
  // If we have a cached connection, use it
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  // If a connection promise exists, wait for it
  if (cached.promise) {
    try {
      await cached.promise;
    } catch (e) {
      cached.promise = null;
      throw e;
    }
    return { client: cached.client, db: cached.db };
  }

  // Otherwise, create a new connection
  const opts = {
    maxPoolSize: 1,  // Serverless functions typically handle one request at a time
    minPoolSize: 0,   // Don't maintain idle connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
  };

  cached.promise = MongoClient.connect(MONGODB_URI, opts)
    .then((client) => {
      console.log('MongoDB connected');
      cached.client = client;
      cached.db = client.db(MONGODB_DB);
      return { client: cached.client, db: cached.db };
    })
    .catch((e) => {
      cached.promise = null;
      throw e;
    });

  try {
    const result = await cached.promise;
    return result;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

module.exports = { connectDB };