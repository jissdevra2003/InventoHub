import mongoose from 'mongoose'




// ---------- DATABASE & SERVER START ----------
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '', {
      // Connection pool: reuse connections instead of creating new ones per query
      maxPoolSize: 10,
      // Fail fast if MongoDB is unreachable (default is 30s which is too slow)
      serverSelectionTimeoutMS: 5000,
      // Close idle sockets after 45s (prevents stale connections)
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB successfully");

  } catch (error) {
    console.error("DB Connection Failed", error);
    process.exit(1); // stop server startup
  }
};