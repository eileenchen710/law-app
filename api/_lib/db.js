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
  if (cached.conn && cached.conn.connection.readyState === 1) {
    console.log('Using existing database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      dbName: MONGODB_DB,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
    };

    console.log('Creating new database connection...');
    cached.promise = mongoose.connect(MONGODB_URI, options).then((mongooseInstance) => {
      console.log('Database connected successfully');
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
