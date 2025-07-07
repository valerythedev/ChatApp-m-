// backend/DB/connectToMongoDb.js

import mongoose from "mongoose";

const connectToMongoDb = async () => {
  try {
    console.log("🔌 Intentando conectar a MongoDB...");

    const uri = process.env.MONGO_DB_URI;
    if (!uri) {
      throw new Error("❌ MONGO_DB_URI no está definido en el .env");
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = conn.connection.db;
    console.log("✅ Conectado a MongoDB database:", db.databaseName);

    const cols = await db.listCollections().toArray();
    console.log("🔎 Colecciones disponibles:", cols.map(c => c.name));

  } catch (error) {
    console.error("❌ Error al conectar:", error.message);
    throw error;
  }
};

export default connectToMongoDb;
