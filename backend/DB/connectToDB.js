import mongoose from 'mongoose';

const connectToMongoDb = async () => {
  try {
    console.log("🔌 Intentando conectar a MongoDB...");
    
    if (!process.env.MONGO_DB_URI) {
      throw new Error("❌ MONGO_DB_URI no está definido en el .env");
    }

    await mongoose.connect(process.env.MONGO_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("✅ Conectado a MongoDB");
  } catch (error) {
    console.error("❌ Error al conectar:", error.message);
    throw error;
  }
};

export default connectToMongoDb;
