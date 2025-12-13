import mongoose from 'mongoose'




// ---------- DATABASE & SERVER START ----------
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log("Connected to MongoDB successfully");

  } catch (error) {
    console.error("DB Connection Failed", error);
    process.exit(1); // stop server startup
  }
};