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
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      dbName: MONGODB_DB,
    };

    cached.promise = mongoose.connect(MONGODB_URI, options).then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectToDatabase;
module.exports.default = connectToDatabase;
